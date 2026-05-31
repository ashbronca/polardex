import { TcgCard, pickPrice } from '../services/tcg';
import { CardModel } from './types';
import { generateCardId } from './mutations';

/** Per-variant counts for a card. Reads `variantQty` if present, else derives
 *  from the legacy `variants` booleans + total `quantity`. */
export function getVariantQty(card?: CardModel | null): { normal: number; alternate: number } {
  if (!card) return { normal: 0, alternate: 0 };
  const vq = card.attributes.variantQty;
  if (vq) return { normal: Math.max(0, vq.normal ?? 0), alternate: Math.max(0, vq.alternate ?? 0) };
  const v = card.attributes.variants;
  const q = card.quantity ?? 1;
  if (v?.normal && v?.alternate) return { normal: Math.max(1, q - 1), alternate: 1 };
  if (v?.alternate) return { normal: 0, alternate: q };
  return { normal: q, alternate: 0 };
}

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
