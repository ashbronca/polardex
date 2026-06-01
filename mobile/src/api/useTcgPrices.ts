import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tcgFetch } from '../services/tcg';

const CHUNK_SIZE = 50;
const CACHE_KEY = 'polardex_prices_v3';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
const EUR_TO_USD = 1.08; // rough; only used for the Cardmarket fallback

interface PriceRow {
  id?: string;
  tcgplayer?: { prices?: Record<string, { market?: number | null } | undefined> };
  cardmarket?: { prices?: { averageSellPrice?: number | null; trendPrice?: number | null; avg30?: number | null } };
}

/**
 * Best USD price for a card: TCGPlayer market first, else Cardmarket avg (EUR→USD)
 * so cards without TCGPlayer coverage (older/European runs) still get a value.
 */
function pickPrice(card: PriceRow): number | null {
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
  const cm = card.cardmarket?.prices;
  if (cm) {
    const eur = cm.averageSellPrice ?? cm.trendPrice ?? cm.avg30 ?? null;
    if (eur != null && eur > 0) return eur * EUR_TO_USD;
  }
  return null;
}

async function readCache(): Promise<Map<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const { prices, timestamp } = JSON.parse(raw) as { prices: Record<string, number>; timestamp: number };
    if (Date.now() - timestamp > CACHE_TTL) return new Map();
    return new Map(Object.entries(prices));
  } catch {
    return new Map();
  }
}

// Strip the negative-cache sentinels (0) so consumers only see real prices.
function pricesOnly(map: Map<string, number>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [id, p] of map) if (p > 0) out.set(id, p);
  return out;
}

function writeCache(map: Map<string, number>) {
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ prices: Object.fromEntries(map), timestamp: Date.now() })).catch(() => {});
}

/**
 * Live TCGPlayer/Cardmarket prices (USD) for a set of TCG card IDs. Only fetches
 * IDs missing from the 24h AsyncStorage cache; negative-caches price-less IDs so
 * they aren't re-queried. Returns a map of id → USD price (real prices only).
 */
export function useTcgPrices(tcgIds: string[]) {
  const [priceMap, setPriceMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  const idsKey = useMemo(() => [...new Set(tcgIds)].sort().join(','), [tcgIds]);

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (!ids.length) {
      setPriceMap(new Map());
      return;
    }
    let cancelled = false;

    (async () => {
      const cached = await readCache();
      if (!cancelled) setPriceMap(pricesOnly(cached));

      const missing = ids.filter((id) => !cached.has(id));
      if (!missing.length) return;

      if (!cancelled) setLoading(true);
      const all = new Map(cached);
      let changed = false;

      const chunks: string[][] = [];
      for (let i = 0; i < missing.length; i += CHUNK_SIZE) chunks.push(missing.slice(i, i + CHUNK_SIZE));

      await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const q = chunk.map((id) => `id:${id}`).join(' OR ');
            const res = await tcgFetch(`/cards?q=${encodeURIComponent(q)}&pageSize=${CHUNK_SIZE}&select=id,tcgplayer,cardmarket`);
            if (!res.ok) return;
            const json = (await res.json()) as { data?: PriceRow[] };
            for (const id of chunk) if (!all.has(id)) all.set(id, 0); // negative-cache
            for (const card of json.data ?? []) {
              const price = pickPrice(card);
              if (card.id && price != null && price > 0) all.set(card.id, price);
            }
            changed = true;
          } catch {
            /* leave missing → retried next time */
          }
        }),
      );

      if (changed) writeCache(all);
      if (!cancelled) {
        setPriceMap(pricesOnly(all));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [idsKey]);

  return { priceMap, loading };
}
