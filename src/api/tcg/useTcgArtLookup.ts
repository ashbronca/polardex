import { useEffect, useMemo, useState } from 'react';

type ArtMap = Record<string, string>; // pokémon name (lowercase) → large image URL

const SESSION_PREFIX = 'polardex_tcgart_';
const BATCH_SIZE = 8;
const BASE = 'https://api.pokemontcg.io/v2';

function readSessionCache(name: string): string | null {
  try {
    return sessionStorage.getItem(SESSION_PREFIX + name.toLowerCase());
  } catch {
    return null;
  }
}

function writeSessionCache(name: string, url: string) {
  try {
    sessionStorage.setItem(SESSION_PREFIX + name.toLowerCase(), url);
  } catch {}
}

async function fetchBatch(names: string[]): Promise<ArtMap> {
  const q = names.map((n) => `name:"${n}"`).join(' OR ');
  try {
    const res = await fetch(
      `${BASE}/cards?q=${encodeURIComponent(q)}&pageSize=${BATCH_SIZE * 2}&select=name,images`,
    );
    if (!res.ok) return {};
    const json = await res.json();
    const map: ArtMap = {};
    for (const card of json.data ?? []) {
      const key = (card.name as string).toLowerCase();
      if (!map[key]) {
        map[key] = (card.images?.large ?? card.images?.small ?? '') as string;
        writeSessionCache(key, map[key]);
      }
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Auto-fetches TCG card artwork for a list of Pokémon names.
 * Only fires when `enabled` is true. Results are cached in sessionStorage.
 */
export function useTcgArtLookup(names: string[], enabled: boolean) {
  const [artMap, setArtMap] = useState<ArtMap>({});
  const [loading, setLoading] = useState(false);

  // stable key: sorted unique names joined
  const namesKey = useMemo(
    () => [...new Set(names.map((n) => n.toLowerCase()))].sort().join(','),
    [names],
  );

  useEffect(() => {
    if (!enabled || !namesKey) return;

    const uniqueNames = namesKey.split(',').filter(Boolean);

    // Hydrate from session cache first
    const cached: ArtMap = {};
    const toFetch: string[] = [];

    for (const name of uniqueNames) {
      const hit = readSessionCache(name);
      if (hit) {
        cached[name] = hit;
      } else {
        toFetch.push(name);
      }
    }

    setArtMap((prev) => ({ ...prev, ...cached }));

    if (toFetch.length === 0) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      // Process in batches sequentially to avoid rate-limit bursts
      const result: ArtMap = {};
      for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
        if (cancelled) break;
        const batch = toFetch.slice(i, i + BATCH_SIZE);
        const batchResult = await fetchBatch(batch);
        Object.assign(result, batchResult);
        if (!cancelled) {
          setArtMap((prev) => ({ ...prev, ...result }));
        }
        // Small delay between batches to be polite to the free API
        if (i + BATCH_SIZE < toFetch.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, namesKey]);

  return { artMap, loading };
}
