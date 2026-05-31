import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tcgFetch, TcgSet, TcgCard } from '../services/tcg';

const SETS_CACHE = 'polardex_sets_v1';
const SETS_TTL = 24 * 60 * 60 * 1000;

let setsPromise: Promise<TcgSet[]> | null = null;

async function loadSets(): Promise<TcgSet[]> {
  try {
    const raw = await AsyncStorage.getItem(SETS_CACHE);
    if (raw) {
      const { sets, timestamp } = JSON.parse(raw) as { sets: TcgSet[]; timestamp: number };
      if (Date.now() - timestamp < SETS_TTL) return sets;
    }
  } catch {
    /* fall through */
  }
  if (!setsPromise) {
    setsPromise = (async () => {
      try {
        // NOTE: do NOT add &select here — the TCG API's select on /sets is ~3x
        // SLOWER (12s vs 4s) despite a smaller payload. Fetch full set objects.
        const res = await tcgFetch('/sets?orderBy=-releaseDate&pageSize=250');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data: TcgSet[] };
        const sets = json.data ?? [];
        AsyncStorage.setItem(SETS_CACHE, JSON.stringify({ sets, timestamp: Date.now() })).catch(() => {});
        return sets;
      } catch {
        return [];
      } finally {
        setsPromise = null;
      }
    })();
  }
  return setsPromise;
}

/** Loads the TCG set list once; filter client-side. */
export function useTcgSets() {
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadSets().then((s) => {
      if (cancelled) return;
      setSets(s);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);
  return { sets, ready };
}

// ── Cards within a set ──────────────────────────────────────────────────────
const SET_CARDS_PREFIX = 'polardex_set_cards_v1_';
const SET_CARDS_TTL = 7 * 24 * 60 * 60 * 1000;
const PAGE = 60;
const CARD_SELECT = 'id,name,number,rarity,types,images,set,tcgplayer';

// The TCG API can return the same card on two pages when `number` ties during
// pagination — dedupe by id so React keys stay unique.
function dedupeById(cards: TcgCard[]): TcgCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

// Sort by set number: numeric cards ascending (1,2,…,10,…102), then lettered
// numbers (promos, TGxx, SVxx) after, alphabetically.
function setNumberValue(n: string): number {
  const m = /^\d+/.exec((n ?? '').trim());
  return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;
}
function sortByNumber(cards: TcgCard[]): TcgCard[] {
  return [...cards].sort((a, b) => {
    const va = setNumberValue(a.number);
    const vb = setNumberValue(b.number);
    return va !== vb ? va - vb : (a.number ?? '').localeCompare(b.number ?? '');
  });
}

async function getCachedSetCards(
  setId: string,
): Promise<{ cards: TcgCard[]; total: number; complete: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(SET_CARDS_PREFIX + setId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { cards: TcgCard[]; total: number; complete?: boolean; timestamp: number };
    if (Date.now() - parsed.timestamp > SET_CARDS_TTL) return null;
    return { cards: sortByNumber(dedupeById(parsed.cards)), total: parsed.total, complete: !!parsed.complete };
  } catch {
    return null;
  }
}

function cacheSetCards(setId: string, cards: TcgCard[], total: number, complete: boolean) {
  AsyncStorage.setItem(
    SET_CARDS_PREFIX + setId,
    JSON.stringify({ cards, total, complete, timestamp: Date.now() }),
  ).catch(() => {});
}

const pageUrl = (setId: string, p: number) =>
  `/cards?q=set.id:${setId}&orderBy=number&pageSize=${PAGE}&page=${p}&select=${CARD_SELECT}`;

/**
 * Cards in a set. Shows cached instantly, else streams page 1 fast then pulls
 * the rest in parallel (the TCG API chokes on big single requests).
 */
export function useSetCards(setId: string | null) {
  const [cards, setCards] = useState<TcgCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!setId) { setCards([]); setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const cached = await getCachedSetCards(setId);
      if (cached) {
        if (!cancelled) { setCards(cached.cards); setLoading(false); }
        if (cached.complete) return; // fully cached — no network
      } else {
        if (!cancelled) setLoading(true);
      }

      // A cached-but-incomplete set is always just page 1, so we resume at page 2.
      let all: TcgCard[] = cached?.cards ?? [];
      let total = cached?.total ?? 0;
      if (!cached) {
        try {
          const res = await tcgFetch(pageUrl(setId, 1));
          if (!res.ok) throw new Error();
          const json = (await res.json()) as { data: TcgCard[]; totalCount?: number };
          all = sortByNumber(dedupeById(json.data ?? []));
          total = json.totalCount ?? all.length;
          const done = all.length >= total;
          if (!cancelled) { setCards(all); setLoading(false); }
          cacheSetCards(setId, all, total, done);
          if (done) return;
        } catch {
          if (!cancelled) setLoading(false);
          return;
        }
      }

      const pages: number[] = [];
      for (let p = 2; p <= Math.ceil(total / PAGE); p++) pages.push(p);
      const results = await Promise.all(
        pages.map((p) => tcgFetch(pageUrl(setId, p)).then((r) => (r.ok ? r.json() : null))),
      );
      let complete = true;
      for (const j of results) {
        if (!j) { complete = false; continue; }
        all = all.concat((j.data ?? []) as TcgCard[]);
      }
      all = sortByNumber(dedupeById(all));
      if (!cancelled) setCards(all);
      if (complete) cacheSetCards(setId, all, total, true);
    })();

    return () => { cancelled = true; };
  }, [setId]);

  return { cards, loading };
}

/** The specific TCG cards matching a pokémon name within a set (to pick exact art). */
export async function fetchCardsByNameAndSet(name: string, setName: string): Promise<TcgCard[]> {
  try {
    const q = `name:"${name}" set.name:"${setName}"`;
    const res = await tcgFetch(
      `/cards?q=${encodeURIComponent(q)}&orderBy=number&pageSize=30&select=id,name,number,rarity,types,images,set,tcgplayer`,
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { data: TcgCard[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}
