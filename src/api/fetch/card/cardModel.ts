import { PokemonModel } from '../pokemon';

/**
 * Runtime guard — validates a value looks like a CardModel before letting it
 * through. Intentionally permissive: we only check the fields we actually use
 * downstream. Shared by the query hook and the migration.
 */
export function isValidCardModel(value: unknown): value is CardModel {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.cardId !== 'string') return false;
  const pokemon = v.pokemonData as Record<string, unknown> | undefined;
  if (!pokemon || typeof pokemon !== 'object') return false;
  if (typeof pokemon.name !== 'string') return false;
  const attrs = v.attributes as Record<string, unknown> | undefined;
  if (!attrs || typeof attrs !== 'object') return false;
  if (typeof attrs.set !== 'string') return false;
  return true;
}

export interface CardModel {
  cardId: string;
  quantity: number;
  setNumber: number;
  attributes: AttributeCardModel;
  pokemonData: PokemonModel;
  createdAt?: number;    // ms since epoch, set on first save
  updatedAt?: number;    // ms since epoch, set on every save
  status?: 'owned' | 'wishlist';  // defaults to 'owned' when absent
  manualOrder?: number;  // user-drag-reorder index in Studio
  notes?: string;        // free-form personal notes (e.g. "PSA 9", "gift from Tom")
  meta?: unknown;
}

export interface TempCardModel {
  pokemonData: PokemonModel;
  cardId?: string;
  quantity?: string;
  setNumber?: number;
  attributes?: AttributeCardModel;
  meta?: unknown;
}

export interface AttributeCardModel {
  cardType: string;
  set: string;
  rarity: string;
  condition: string;
  grading: number;
  isGraded?: boolean;
  tcgId?: string;         // Pokemon TCG API card ID e.g. "base1-4"
  tcgImageUrl?: string;   // Full card artwork URL from TCG API
  marketPrice?: number;   // TCGPlayer market price at time of adding (USD)
  variants?: {
    normal: boolean;        // own the standard print
    alternate: boolean;     // own the alternate print (Rev. Holo, Full Art, Alternate Art, etc.)
    reverseHolo?: boolean;  // legacy field — kept for backward compat with existing DB records
  };
  meta?: unknown;
}
