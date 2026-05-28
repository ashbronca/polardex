import { supabase } from '../services/supabase.config';
import { CardModel } from './fetch/card/cardModel';
import { cardToRow } from './fetch/card/cardRow';
import { AttributeModel } from './fetch/attributes/attributesModel';

const isReadOnly = () => sessionStorage.getItem('polardex_readonly') === 'true';

// Fires a window event so the app can surface a toast without this module
// having to depend on React context. Handled in App.tsx.
const blockedByReadOnly = (): boolean => {
  if (!isReadOnly()) return false;
  window.dispatchEvent(new CustomEvent('polardex:readonly-blocked'));
  return true;
};

/** Add or overwrite a card. Ensures its pokemon row exists first (FK). */
export async function saveCard(card: CardModel): Promise<void> {
  if (blockedByReadOnly()) return;

  const now = new Date();
  const createdAt = card.createdAt ? new Date(card.createdAt) : now;

  // pokemonData is denormalized onto the card row (see cardToRow), so there's
  // no separate pokemon write.
  const row = {
    ...cardToRow(card),
    created_at: createdAt.toISOString(),
    updated_at: now.toISOString(),
  };
  const { error } = await supabase.from('cards').upsert(row);
  if (error) throw error;
}

/** Remove a card. */
export async function removeCard(cardId: string): Promise<void> {
  if (blockedByReadOnly()) return;
  const { error } = await supabase.from('cards').delete().eq('card_id', cardId);
  if (error) throw error;
}

/** Add or overwrite an attribute (dropdown option). */
export async function saveAttribute(attribute: AttributeModel): Promise<void> {
  if (blockedByReadOnly()) return;
  const { error } = await supabase.from('attributes').upsert({
    id: attribute.id,
    type: attribute.type,
    name: attribute.name,
    meta: attribute.meta ?? null,
  });
  if (error) throw error;
}

/** Generate a short unique card ID. */
export function generateCardId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
