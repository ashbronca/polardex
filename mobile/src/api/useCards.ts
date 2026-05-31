import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestore } from '../services/firebase.config';
import { CardModel, isValidCardModel } from './types';

/**
 * Live subscription to the shared `cards` collection (same data as the web app).
 * Mirrors the web CardsProvider's normalize + sort. Returns the same shape.
 */
export function useCards() {
  const [cards, setCards] = useState<CardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(firestore, 'cards'),
      (snap) => {
        const all: CardModel[] = [];
        snap.forEach((doc) => {
          if (doc.id === 'data') return; // skip the legacy single-doc format
          const data = doc.data();
          if (isValidCardModel(data)) all.push(data as CardModel);
        });
        const normalized = all.map((c) =>
          (c.status as unknown) === 'wanted' ? { ...c, status: 'wishlist' as const } : c,
        );
        normalized.sort((a, b) => a.pokemonData.name.localeCompare(b.pokemonData.name));
        setCards(normalized);
        setLoading(false);
      },
      (err) => {
        console.error('cards listener error', err);
        setError('Failed to load cards');
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { cards, loading, error };
}
