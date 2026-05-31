import { useEffect, useState } from 'react';
import { TcgSet } from './types';
import { tcgFetch } from './tcgFetch';

const BASE = 'https://api.pokemontcg.io/v2';
const CACHE_KEY = 'polardex_sets_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function readCache(): TcgSet[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { sets, timestamp } = JSON.parse(raw) as { sets: TcgSet[]; timestamp: number };
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return sets;
  } catch {
    return null;
  }
}

function writeCache(sets: TcgSet[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ sets, timestamp: Date.now() }));
  } catch {
    // storage full or unavailable - ignore
  }
}

export function usePokemonSetsQuery() {
  const [sets, setSets] = useState<TcgSet[]>(() => readCache() ?? []);
  const [loading, setLoading] = useState(() => readCache() === null);
  const [error, setError] = useState<string | null>(null);
  const [fetchTick, setFetchTick] = useState(0);

  useEffect(() => {
    const cached = readCache();
    if (cached && fetchTick === 0) {
      setSets(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    async function fetchSets() {
      try {
        const res = await tcgFetch(
          `${BASE}/sets?orderBy=-releaseDate&pageSize=250`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data: TcgSet[] = json.data ?? [];
        setSets(data);
        writeCache(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Failed to load sets. Try refreshing the page.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchSets();
    return () => controller.abort();
  }, [fetchTick]);

  const refresh = () => {
    localStorage.removeItem(CACHE_KEY);
    setFetchTick((n) => n + 1);
  };

  return { sets, loading, error, refresh };
}
