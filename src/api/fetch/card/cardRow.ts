import { CardModel } from './cardModel';
import { PokemonModel } from '../pokemon';

/**
 * Shape of a `cards` row joined with its `pokemon` row, as returned by
 * `supabase.from('cards').select('*, pokemon(*)')`. Kept loose on purpose —
 * PostgREST hands back snake_case columns and a nested `pokemon` object.
 */
export interface PokemonRow {
  id: number;
  name: string;
  type: string | null;
  image_url: string | null;
  evolutions: PokemonModel['evolutions'] | null;
  meta?: unknown;
}

export interface CardRow {
  card_id: string;
  pokemon_id: number | null;
  quantity: number;
  set_number: number | null;
  status: 'owned' | 'wishlist';
  manual_order: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  card_type: string | null;
  set: string | null;
  rarity: string | null;
  condition: string | null;
  grading: number | null;
  is_graded: boolean | null;
  tcg_id: string | null;
  tcg_image_url: string | null;
  market_price: number | null;
  variant_normal: boolean | null;
  variant_alternate: boolean | null;
  variant_reverse_holo: boolean | null;
  meta?: unknown;
  pokemon: PokemonRow | null;
}

const nn = <T>(v: T | null | undefined): T | undefined => (v == null ? undefined : v);

export function pokemonRowToModel(row: PokemonRow): PokemonModel {
  return {
    id: row.id,
    name: row.name,
    type: row.type ?? '',
    imageUrl: row.image_url ?? '',
    evolutions: row.evolutions ?? { first: { name: row.name, imageUrl: row.image_url ?? '' } },
    meta: row.meta,
  };
}

/** Rebuild the app's CardModel from a joined cards⨝pokemon row. */
export function cardRowToModel(row: CardRow): CardModel {
  const pokemon = row.pokemon;
  return {
    cardId: row.card_id,
    quantity: row.quantity,
    setNumber: row.set_number ?? 0,
    status: row.status,
    manualOrder: nn(row.manual_order),
    notes: nn(row.notes),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    pokemonData: pokemon
      ? pokemonRowToModel(pokemon)
      : { name: '', id: row.pokemon_id ?? 0, type: '', imageUrl: '', evolutions: { first: { name: '', imageUrl: '' } } },
    attributes: {
      cardType: row.card_type ?? '',
      set: row.set ?? '',
      rarity: row.rarity ?? '',
      condition: row.condition ?? '',
      grading: row.grading ?? 0,
      isGraded: nn(row.is_graded),
      tcgId: nn(row.tcg_id),
      tcgImageUrl: nn(row.tcg_image_url),
      marketPrice: nn(row.market_price),
      variants: {
        normal: row.variant_normal ?? false,
        alternate: row.variant_alternate ?? false,
        reverseHolo: nn(row.variant_reverse_holo),
      },
    },
    meta: row.meta,
  };
}

/** Flatten a CardModel into a `cards` table row for insert/upsert. */
export function cardToRow(card: CardModel): Record<string, unknown> {
  const a = card.attributes;
  return {
    card_id: card.cardId,
    pokemon_id: card.pokemonData?.id ?? null,
    quantity: card.quantity,
    set_number: card.setNumber ?? null,
    status: card.status ?? 'owned',
    manual_order: card.manualOrder ?? null,
    notes: card.notes ?? null,
    card_type: a?.cardType ?? null,
    set: a?.set ?? null,
    rarity: a?.rarity ?? null,
    condition: a?.condition ?? null,
    grading: a?.grading ?? null,
    is_graded: a?.isGraded ?? null,
    tcg_id: a?.tcgId ?? null,
    tcg_image_url: a?.tcgImageUrl ?? null,
    market_price: a?.marketPrice ?? null,
    variant_normal: a?.variants?.normal ?? null,
    variant_alternate: a?.variants?.alternate ?? null,
    variant_reverse_holo: a?.variants?.reverseHolo ?? null,
  };
}
