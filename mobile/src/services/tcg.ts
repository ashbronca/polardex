// Pokémon TCG API access for mobile. Same public read-only key as the web app
// (raises the rate limit above the throttled anonymous pool).
const API_KEY = '624caf8b-691b-4cad-b039-d036829ad362';
const BASE = 'https://api.pokemontcg.io/v2';

export function tcgFetch(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { headers: { 'X-Api-Key': API_KEY } });
}

export interface TcgSet {
  id: string;
  name: string;
  series: string;
  total: number;
  releaseDate?: string;
  images?: { logo?: string; symbol?: string };
}

export interface TcgCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  types?: string[];
  images: { small: string; large: string };
  set: { id: string; name: string; printedTotal?: number; total?: number };
  tcgplayer?: { prices?: Record<string, { market?: number | null } | undefined> };
}

/** Best available market price (USD) for a TCG card, mirroring the web logic. */
export function pickPrice(card: TcgCard): number | undefined {
  const p = card.tcgplayer?.prices;
  if (!p) return undefined;
  const usd =
    p['normal']?.market ??
    p['holofoil']?.market ??
    p['reverseHolofoil']?.market ??
    p['1stEditionHolofoil']?.market ??
    p['1stEditionNormal']?.market ??
    undefined;
  return usd != null && usd > 0 ? usd : undefined;
}
