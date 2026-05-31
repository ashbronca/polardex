import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '../services/firebase.config';
import { CardModel } from './types';

export function generateCardId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Firestore rejects `undefined` values — strip them before writing.
function stripUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, typeof v === 'object' && v !== null ? stripUndefined(v) : v]),
  ) as T;
}

/** Add or overwrite a card document (same shape/collection as the web app). */
export async function saveCard(card: CardModel): Promise<void> {
  const now = Date.now();
  const withTimestamps: CardModel = {
    ...card,
    createdAt: card.createdAt ?? now,
    updatedAt: now,
  };
  await setDoc(doc(firestore, 'cards', withTimestamps.cardId), stripUndefined(withTimestamps));
}

export async function removeCard(cardId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'cards', cardId));
}
