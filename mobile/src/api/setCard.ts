import { TcgCard, pickPrice } from '../services/tcg';
import { CardModel } from './types';
import { generateCardId } from './mutations';

/**
 * Build a CardModel from a TCG card. Condition defaults to the highest
 * non-graded grade ("Mint") and isn't surfaced in the add UI.
 */
export function tcgToCard(
  c: TcgCard,
  status: 'owned' | 'wishlist',
  variant: 'normal' | 'alternate' = 'normal',
): CardModel {
  return {
    cardId: generateCardId(),
    quantity: 1,
    setNumber: Number(c.number) || 0,
    status,
    attributes: {
      cardType: variant === 'alternate' ? 'Alternate' : 'Standard',
      set: c.set.name,
      rarity: c.rarity ?? '',
      condition: 'Mint',
      grading: 0,
      isGraded: false,
      tcgId: c.id,
      tcgImageUrl: c.images.large ?? c.images.small,
      marketPrice: pickPrice(c),
      variants: { normal: variant === 'normal', alternate: variant === 'alternate' },
    },
    pokemonData: {
      name: c.name,
      id: 0,
      type: c.types?.[0] ?? '',
      imageUrl: c.images.large ?? c.images.small,
      evolutions: { first: { name: '', imageUrl: '' } },
    },
  };
}
