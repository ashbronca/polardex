import { useEffect, useState } from 'react';
import { TcgCard } from './types';

const BASE = 'https://api.pokemontcg.io/v2';
// v2: bumped because the cached shape changed (trimmed `select`) and the store
// moved from sessionStorage → localStorage with a TTL.
const CACHE_PREFIX = 'polardex_set_cards_v2_';
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
  timestamp: number;
}

function getCached(setId: string): TcgCard[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + setId);
    if (!raw) return null;
    const { cards, timestamp } = JSON.parse(raw) as SetCardsCache;
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return cards;
  } catch {
    return null;
  }
}

function setCache(setId: string, cards: TcgCard[]) {
  const payload = JSON.stringify({ cards, timestamp: Date.now() } satisfies SetCardsCache);
  try {
    localStorage.setItem(CACHE_PREFIX + setId, payload);
  } catch {
    // Quota exceeded — evict other cached sets and retry once.
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX) && key !== CACHE_PREFIX + setId) {
          localStorage.removeItem(key);
        }
      }
      localStorage.setItem(CACHE_PREFIX + setId, payload);
    } catch {
      // still no room — give up, we just won't have a persistent cache
    }
  }
}

export function usePokemonSetCardsQuery(setId: string | null) {
  const [cards, setCards] = useState<TcgCard[]>(() => {
    if (!setId) return [];
    return getCached(setId) ?? [];
  });
  const [loading, setLoading] = useState(() => {
    if (!setId) return false;
    return getCached(setId) === null;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setId) {
      setCards([]);
      setLoading(false);
      return;
    }

    const cached = getCached(setId);
    if (cached) {
      setCards(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setError(null);

    const pageUrl = (p: number) =>
      `${BASE}/cards?q=set.id:${setId}&orderBy=number&pageSize=${PAGE}&page=${p}&select=${SELECT}`;

    async function fetchCards() {
      // Page 1 — fast first paint. A failure here is a real error (nothing shown).
      let all: TcgCard[];
      let total: number;
      try {
        const res = await fetch(pageUrl(1), { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        all = json.data ?? [];
        total = json.totalCount ?? all.length;
        setCards(all);
        setLoading(false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError('Failed to load cards');
        setLoading(false);
        return;
      }

      // Remaining pages stream in the background and append. A failure here just
      // stops (we keep what loaded) and skips caching so it's retried next time.
      if (all.length >= total) {
        setCache(setId!, all);
        return;
      }
      try {
        const lastPage = Math.ceil(total / PAGE);
        for (let p = 2; p <= lastPage; p++) {
          const res = await fetch(pageUrl(p), { signal });
          if (!res.ok) return;
          const json = await res.json();
          all = all.concat((json.data ?? []) as TcgCard[]);
          setCards(all);
        }
        setCache(setId!, all); // full set — cache it
      } catch {
        // abort / network — leave the partial list, don't cache
      }
    }

    fetchCards();
    return () => controller.abort();
  }, [setId]);

  return { cards, loading, error };
}
