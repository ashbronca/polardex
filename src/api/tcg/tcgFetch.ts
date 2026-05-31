// Shared fetch wrapper for the Pokémon TCG API. Attaches the API key (if set)
// as X-Api-Key, which raises the rate limit well above the throttled anonymous
// pool — letting us fetch set pages in parallel without 429s.
//
// Note: VITE_ vars are inlined into the client bundle, so this key is visible in
// devtools. That's acceptable here — it's a read-only public-data rate-limit
// key, not an account secret.
const API_KEY = import.meta.env.VITE_POKEMONTCG_API_KEY;

export function tcgFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (API_KEY) headers.set('X-Api-Key', API_KEY);
  return fetch(url, { ...init, headers });
}
