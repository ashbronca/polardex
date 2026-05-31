import { useEffect, useState } from 'react';
import { TcgCard } from './types';
import { tcgFetch } from './tcgFetch';

const BASE = 'https://api.pokemontcg.io/v2';
// v3: cache now stores { cards, total } so a reopen can show the cached cards
// instantly and only background-fetch the pages that are still missing.
const CACHE_PREFIX = 'polardex_set_cards_v3_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days — set card lists rarely change
// The TCG API is fast for small result sets but chokes on big ones (a 250-card
// page can take 40s+, while a 60-card page returns in ~2-3s). So load the first
// page fast for instant first paint, then stream the rest in the background.
const PAGE = 60;

// Only the fields the Sets UI actually reads. The TCG API otherwise returns the
// full card object (attacks, abilities, rules, legalities, flavorText, …) for
// every card — multiple MB per 250-card set on the slow, un-keyed free tier.
const SELECT = 'id,name,number,rarity,types,images,set,tcgplayer';

interface SetCardsCache {
  cards: TcgCard[];
  total: number;
  timestamp: number;
}

function getCached(setId: string): SetCardsCache | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + setId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SetCardsCache;
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Only ever cache a page-aligned result (page 1, or the complete set) so a
// resumed reopen knows exactly which page to continue from.
function setCache(setId: string, cards: TcgCard[], total: number) {
  const payload = JSON.stringify({ cards, total, timestamp: Date.now() } satisfies SetCardsCache);
  try {
    localStorage.setItem(CACHE_PREFIX + setId, payload);
  } catch {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX) && key !== CACHE_PREFIX + setId) {
          localStorage.removeItem(key);
        }
      }
      localStorage.setItem(CACHE_PREFIX + setId, payload);
    } catch {
      // still no room — give up on the persistent cache
    }
  }
}

export function usePokemonSetCardsQuery(setId: string | null) {
  const [cards, setCards] = useState<TcgCard[]>(() => (setId ? getCached(setId)?.cards ?? [] : []));
  const [loading, setLoading] = useState(() => (setId ? getCached(setId) === null : false));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setId) {
      setCards([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const pageUrl = (p: number) =>
      `${BASE}/cards?q=set.id:${setId}&orderBy=number&pageSize=${PAGE}&page=${p}&select=${SELECT}`;

    const cached = getCached(setId);

    async function load() {
      let all: TcgCard[] = cached?.cards ?? [];
      let total = cached?.total ?? 0;

      if (cached) {
        // Show cached cards INSTANTLY — no skeleton on reopen.
        setCards(all);
        setLoading(false);
        if (all.length >= total) return; // fully cached — nothing more to do
      } else {
        // Cold open: page 1 first for fast first paint.
        setLoading(true);
        setError(null);
        try {
          const res = await tcgFetch(pageUrl(1), { signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          all = json.data ?? [];
          total = json.totalCount ?? all.length;
          setCards(all);
          setLoading(false);
          // Cache page 1 right away so even an interrupted load makes the next
          // open instant (it'll resume the remaining pages in the background).
          setCache(setId!, all, total);
        } catch (err) {
          if ((err as Error).name !== 'AbortError') setError('Failed to load cards');
          setLoading(false);
          return;
        }
        if (all.length >= total) return;
      }

      // Remaining pages stream in the background (no skeleton — cards already
      // showing). Resume from wherever the cached/page-1 data left off.
      try {
        const fromPage = Math.floor(all.length / PAGE) + 1;
        const restPages: number[] = [];
        for (let p = fromPage; p <= Math.ceil(total / PAGE); p++) restPages.push(p);
        const results = await Promise.all(
          restPages.map((p) =>
            tcgFetch(pageUrl(p), { signal }).then((r) => (r.ok ? r.json() : null)),
          ),
        );
        let complete = true;
        for (const json of results) {
          if (!json) { complete = false; continue; }
          all = all.concat((json.data ?? []) as TcgCard[]);
        }
        setCards(all);
        // Only persist the full set (page-aligned). A partial failure keeps the
        // clean page-1 cache so the next open resumes correctly.
        if (complete && all.length >= total) setCache(setId!, all, total);
      } catch {
        // abort / network — keep what we have
      }
    }

    load();
    return () => controller.abort();
  }, [setId]);

  return { cards, loading, error };
}
