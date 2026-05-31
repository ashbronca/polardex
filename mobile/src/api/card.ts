import { CardModel } from './types';

/** Best image for a card: the TCG art if we have it, else the pokémon sprite. */
export const imgUrl = (c: CardModel) => c.attributes.tcgImageUrl || c.pokemonData.imageUrl || '';

/** Owned vs wishlist. Cards default to owned when status is absent. */
export const isOwned = (c: CardModel) => (c.status ?? 'owned') !== 'wishlist';
