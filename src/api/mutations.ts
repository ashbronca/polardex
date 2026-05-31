import { doc, setDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import { firestore } from '../services/firebase.config';
import { CardModel, isValidCardModel } from './fetch/card/cardModel';
import { AttributeModel } from './fetch/attributes/attributesModel';

const isReadOnly = () => sessionStorage.getItem('polardex_readonly') === 'true';

// Fires a window event so the app can surface a toast without this module
// having to depend on React context. Handled in App.tsx.
const blockedByReadOnly = (): boolean => {
  if (!isReadOnly()) return false;
  window.dispatchEvent(new CustomEvent('polardex:readonly-blocked'));
  return true;
};

const attributesRef = () => doc(firestore, 'attributes', 'data');

function stripUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, typeof v === 'object' && v !== null ? stripUndefined(v) : v])
  ) as T;
}

/**
 * Add or overwrite a card as an individual document. Returns `false` when the
 * write was blocked by read-only mode (so callers don't show a fake "success"),
 * `true` when the write actually happened.
 */
export async function saveCard(card: CardModel): Promise<boolean> {
  if (blockedByReadOnly()) return false;
  const now = Date.now();
  const withTimestamps: CardModel = {
    ...card,
    createdAt: card.createdAt ?? now,
    updatedAt: now,
  };
  const clean = stripUndefined(withTimestamps);
  await setDoc(doc(firestore, 'cards', clean.cardId), clean);
  return true;
}

/** Remove a card document. Returns `false` when blocked by read-only mode. */
export async function removeCard(cardId: string): Promise<boolean> {
  if (blockedByReadOnly()) return false;
  await deleteDoc(doc(firestore, 'cards', cardId));
  return true;
}

/**
 * One-time migration: moves cards from the legacy single-document format
 * (cards/data = { cardId: CardModel, ... }) to individual documents
 * (cards/{cardId} = CardModel). Safe to call multiple times — no-ops if
 * the legacy document no longer exists. Retries up to 3 times on failure.
 */
let migrationAttempts = 0;
const MAX_MIGRATION_ATTEMPTS = 3;

export async function migrateCardsToIndividualDocs(): Promise<void> {
  if (migrationAttempts >= MAX_MIGRATION_ATTEMPTS) return;
  migrationAttempts++;

  try {
    const oldDocRef = doc(firestore, 'cards', 'data');
    const oldDoc = await getDoc(oldDocRef);
    if (!oldDoc.exists()) return;

    const data = oldDoc.data() || {};
    const allValues = Object.values(data);
    const cards = allValues.filter(isValidCardModel);

    if (cards.length !== allValues.length) {
      console.warn(
        `[migration] skipped ${allValues.length - cards.length} invalid record(s)`,
      );
    }

    // Guard against a card whose ID would collide with the legacy document
    const safeCards = cards.map((card) =>
      card.cardId === 'data' ? { ...card, cardId: generateCardId() } : card,
    );

    if (safeCards.length === 0) {
      await deleteDoc(oldDocRef);
      return;
    }

    // Firestore batch limit is 500 operations
    const BATCH_LIMIT = 500;
    for (let i = 0; i < safeCards.length; i += BATCH_LIMIT) {
      const batch = writeBatch(firestore);
      const chunk = safeCards.slice(i, i + BATCH_LIMIT);
      for (const card of chunk) {
        batch.set(doc(firestore, 'cards', card.cardId), card);
      }
      await batch.commit();
    }

    // Remove the legacy document after all cards are written
    await deleteDoc(oldDocRef);
    console.info(`[migration] migrated ${safeCards.length} cards to individual documents`);
    // Prevent further attempts after success
    migrationAttempts = MAX_MIGRATION_ATTEMPTS;
  } catch (err) {
    console.error('[migration] failed, will retry on next snapshot', err);
    // migrationAttempts already incremented — allows retry up to the cap
  }
}

/** Add or overwrite an attribute. Returns `false` when blocked by read-only mode. */
export async function saveAttribute(attribute: AttributeModel): Promise<boolean> {
  if (blockedByReadOnly()) return false;
  await setDoc(attributesRef(), { [attribute.id]: attribute }, { merge: true });
  return true;
}

/** Generate a short unique card ID. */
export function generateCardId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
