import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'polardex_aud_rate';
const TTL = 6 * 60 * 60 * 1000; // 6h
const FALLBACK = 1.55;

/**
 * Live USD→AUD rate, cached in AsyncStorage. Stored card prices are USD; the
 * mobile UI shows AUD (unlabelled — just `$`). Falls back to ~1.55.
 */
export function useAudRate(): number {
  const [rate, setRate] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const { rate: r, timestamp } = JSON.parse(raw) as { rate: number; timestamp: number };
          if (r > 0) setRate(r);
          if (Date.now() - timestamp < TTL) return; // fresh enough
        }
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const json = (await res.json()) as { rates?: Record<string, number> };
        const r = json.rates?.AUD;
        if (!cancelled && r && r > 0) {
          setRate(r);
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ rate: r, timestamp: Date.now() })).catch(() => {});
        }
      } catch {
        /* keep fallback */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return rate;
}

/** Format a USD amount as AUD, unlabelled (just `$`). */
export function fmtAud(usd: number, rate: number): string {
  return '$' + (usd * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
