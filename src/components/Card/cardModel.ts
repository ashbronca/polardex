export interface CardModel {
  quantity?: number;
  setNumber?: string;
  attributes?: {
    cardType?: string;
    set?: string;
    rarity?: string;
    condition?: string;
    grading?: number;
    year?: number;
    isGraded?: boolean;
    marketPrice?: number;
    variants?: {
      normal: boolean;
      alternate?: boolean;    // canonical key (Rev. Holo / Full Art / Alt Art)
      reverseHolo?: boolean;  // legacy key — kept for backward compat
    };
    meta?: unknown;
  };
  pokemonData?: {
    name?: string;
    id?: string;
    evolutions?: {
      first?: EvolutionDefinition;
      second?: EvolutionDefinition;
      third?: EvolutionDefinition;
    };
    type?: string;
    imageUrl?: string;
    meta?: unknown;
  };
  meta?: unknown;
}

export interface EvolutionDefinition {
  name: string;
  imageUrl: string;
}

export interface TypesDefinition {
  normal: string;
  fire: string;
  water: string;
  grass: string;
  electric: string;
  ice: string;
  fighting: string;
  poison: string;
  ground: string;
  flying: string;
  psychic: string;
  bug: string;
  rock: string;
  ghost: string;
  dragon: string;
  dark: string;
  steel: string;
  fairy: string;
}
