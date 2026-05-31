import { useEffect, useMemo, useState } from 'react';
import { tcgFetch } from './tcgFetch';

const BASE = 'https://api.pokemontcg.io/v2';
const CHUNK_SIZE = 50;
const CACHE_KEY = 'polardex_prices_v3';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Rough static EUR→USD conversion. We only use this for the fallback to
 * Cardmarket prices when TCGPlayer is unavailable. Refreshed occasionally;
 * good-enough precision for display purposes (vs the user's actual portfolio).
 */
const EUR_TO_USD = 1.08;

interface PriceCache {
  prices: Record<string, number>;
  timestamp: number;
}

// The cache stores a sentinel 0 for IDs we resolved but found NO price for, so
// we don't re-query them every navigation (the negative-cache). readCache
// returns the raw map (incl. sentinels) for the "what's missing" calculation;
// pricesOnly() strips the zeros for the value handed to the UI, so consumers
// only ever see real (> 0) prices — exactly as before.
function readCache(): Map<string, number> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const { prices, timestamp } = JSON.parse(raw) as PriceCache;
    if (Date.now() - timestamp > CACHE_TTL) return new Map();
    return new Map(Object.entries(prices));
  } catch {
    return new Map();
  }
}

function pricesOnly(map: Map<string, number>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [id, price] of map) if (price > 0) out.set(id, price);
  return out;
}

function writeCache(prices: Map<string, number>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      prices: Object.fromEntries(prices),
      timestamp: Date.now(),
    } satisfies PriceCache));
  } catch {
    // storage full — ignore
  }
}

/**
 * Picks the best available price for a card. Priority:
 *   1. TCGPlayer market price (USD) — most relevant for US/AU users
 *   2. Cardmarket average sell price (EUR) — converted to USD as a fallback
 *      so cards without TCGPlayer coverage still get a value. Many European
 *      sets and older runs have cardmarket data but no tcgplayer data.
 */
function pickPrice(card: {
  tcgplayer?: {
    prices?: Record<string, { market?: number | null } | undefined>;
  };
  cardmarket?: {
    prices?: {
      averageSellPrice?: number | null;
      trendPrice?: number | null;
      avg30?: number | null;
    };
  };
}): number | null {
  // 1. TCGPlayer USD
  const tp = card.tcgplayer?.prices;
  if (tp) {
    const usd =
      tp['normal']?.market ??
      tp['holofoil']?.market ??
      tp['reverseHolofoil']?.market ??
      tp['1stEditionHolofoil']?.market ??
      tp['1stEditionNormal']?.market ??
      null;
    if (usd != null && usd > 0) return usd;
  }

  // 2. Cardmarket EUR → USD
  const cm = card.cardmarket?.prices;
  if (cm) {
    const eur = cm.averageSellPrice ?? cm.trendPrice ?? cm.avg30 ?? null;
    if (eur != null && eur > 0) return eur * EUR_TO_USD;
  }

  return null;
}

/**
 * Fetches market prices for the given list of TCG card IDs. Uses TCGPlayer
 * by default and falls back to Cardmarket (EUR converted to USD) for cards
 * without TCGPlayer coverage. Results are cached in localStorage for 24h.
 * Only fetches IDs not already in cache.
 */
export function useTcgPrices(tcgIds: string[]) {
  const [priceMap, setPriceMap] = useState<Map<string, number>>(() => pricesOnly(readCache()));
  const [loading, setLoading] = useState(false);

  // Stable key — only re-run when the set of IDs actually changes
  const idsKey = useMemo(() => [...tcgIds].sort().join(','), [tcgIds]);

  useEffect(() => {
    if (!tcgIds.length) return;

    const cached = readCache();
    const missing = tcgIds.filter((id) => !cached.has(id));

    if (missing.length === 0) {
      setPriceMap(pricesOnly(cached));
      return;
    }

    setLoading(true);

    async function fetchMissing() {
      const allPrices = new Map(cached);
      let changed = false;

      // Split into chunks to avoid URL length limits
      const chunks: string[][] = [];
      for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
        chunks.push(missing.slice(i, i + CHUNK_SIZE));
      }

      await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const query = chunk.map((id) => `id:${id}`).join(' OR ');
            // Request both tcgplayer and cardmarket fields so we can fall back.
            const res = await tcgFetch(
              `${BASE}/cards?q=${encodeURIComponent(query)}&pageSize=${CHUNK_SIZE}&select=id,tcgplayer,cardmarket`,
            );
            if (!res.ok) return;
            const json = await res.json();
            // Negative-cache: mark every requested ID in this (successful) chunk
            // as resolved with sentinel 0, then overwrite with a real price if
            // one was returned. Prevents re-querying price-less cards forever.
            for (const id of chunk) {
              if (!allPrices.has(id)) allPrices.set(id, 0);
            }
            for (const card of json.data ?? []) {
              const price = pickPrice(card);
              if (price != null && price > 0) {
                allPrices.set(card.id as string, price);
              }
            }
            changed = true;
          } catch {
            // network error — leave this chunk's IDs missing so they retry later
          }
        }),
      );

      // Only persist (and reset the TTL) if a chunk actually resolved.
      if (changed) writeCache(allPrices);
      setPriceMap(pricesOnly(allPrices));
      setLoading(false);
    }

    fetchMissing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return { priceMap, loading };
}
