import { useState, useCallback, useEffect } from 'react';

export type Currency = 'AUD' | 'USD';

const STORAGE_KEY = 'polardex_currency';
const CHANGE_EVENT = 'polardex:currency-change';

function readCurrency(): Currency {
  return (localStorage.getItem(STORAGE_KEY) as Currency) ?? 'AUD';
}

export function useCurrency() {
  const [currency, setCurrency] = useState<Currency>(readCurrency);

  // All useCurrency() instances share the persisted value: a toggle anywhere
  // dispatches CHANGE_EVENT so every instance re-reads it (and `storage` keeps
  // other tabs in sync). Previously each call kept independent state, so the
  // currency could disagree across the page until a remount.
  useEffect(() => {
    const sync = () => setCurrency(readCurrency());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next: Currency = readCurrency() === 'AUD' ? 'USD' : 'AUD';
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { currency, toggle };
}

// Intl formatters are cached at module load — re-creating them per call is
// surprisingly expensive when called inside hot lists.
const usdFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const audFormatter = new Intl.NumberFormat('en-AU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtPrice(usd: number, currency: Currency, audRate: number): string {
  if (currency === 'AUD') return `A$${audFormatter.format(usd * audRate)}`;
  return `$${usdFormatter.format(usd)}`;
}
