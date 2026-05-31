import { useEffect, useState } from 'react';

const CACHE_KEY = 'polardex_aud_rate';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Shared in-flight fetch so multiple useAudRate() consumers mounting together
// (Collections, Overview, PriceCheck…) trigger one network request, not N.
let inflight: Promise<number | null> | null = null;

function fetchRate(): Promise<number | null> {
  if (!inflight) {
    inflight = fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => r.json())
      .then((json: { rates?: Record<string, number> }) => {
        const r = json.rates?.AUD;
        if (r && r > 0) {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rate: r, timestamp: Date.now() }));
          return r;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Returns the live USD→AUD exchange rate, cached in sessionStorage. Falls back to ~1.55 if unavailable. */
export function useAudRate(): number {
  const [rate, setRate] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return 1.55;
      const { rate: r, timestamp } = JSON.parse(raw) as { rate: number; timestamp: number };
      if (Date.now() - timestamp > CACHE_TTL) return 1.55;
      return r;
    } catch {
      return 1.55;
    }
  });

  useEffect(() => {
    // Skip fetch if cache is fresh
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { timestamp } = JSON.parse(raw) as { rate: number; timestamp: number };
        if (Date.now() - timestamp < CACHE_TTL) return;
      }
    } catch { /* fall through */ }

    let cancelled = false;
    fetchRate().then((r) => {
      if (!cancelled && r && r > 0) setRate(r);
    });
    return () => { cancelled = true; };
  }, []);

  return rate;
}
