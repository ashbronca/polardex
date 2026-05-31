// Shared data models — ported verbatim from the web app (src/api/fetch/*).
// Keeping them identical means the same Firestore documents deserialize cleanly.

export interface EvolutionDefinition {
  name: string;
  imageUrl: string;
}

export interface EvolutionsDefinition {
  first: EvolutionDefinition;
  second?: EvolutionDefinition;
  third?: EvolutionDefinition;
}

export interface PokemonModel {
  name: string;
  id: number;
  evolutions: EvolutionsDefinition;
  type: string;
  imageUrl: string;
  meta?: unknown;
}

export interface AttributeCardModel {
  cardType: string;
  set: string;
  rarity: string;
  condition: string;
  grading: number;
  year?: number;
  isGraded?: boolean;
  tcgId?: string;
  tcgImageUrl?: string;
  marketPrice?: number;
  variants?: { normal: boolean; alternate?: boolean; reverseHolo?: boolean };
  meta?: unknown;
}

export interface CardModel {
  cardId: string;
  quantity: number;
  setNumber: number;
  attributes: AttributeCardModel;
  pokemonData: PokemonModel;
  createdAt?: number;
  updatedAt?: number;
  status?: 'owned' | 'wishlist';
  manualOrder?: number;
  notes?: string;
  meta?: unknown;
}

export function isValidCardModel(value: unknown): value is CardModel {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.cardId !== 'string') return false;
  const pokemon = v.pokemonData as Record<string, unknown> | undefined;
  if (!pokemon || typeof pokemon.name !== 'string') return false;
  const attrs = v.attributes as Record<string, unknown> | undefined;
  if (!attrs || typeof attrs.set !== 'string') return false;
  return true;
}
