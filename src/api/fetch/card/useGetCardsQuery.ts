import { collection, onSnapshot } from 'firebase/firestore';
import { CardModel, isValidCardModel } from './cardModel';
import { firestore } from '../../../services/firebase.config';
import { useEffect, useState } from 'react';
import { migrateCardsToIndividualDocs } from '../../mutations';

export function useGetCardsQuery() {
  const [cards, setCards] = useState<CardModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const collRef = collection(firestore, 'cards');

    const unsubscribe = onSnapshot(
      collRef,
      (snapshot) => {
        const allCards: CardModel[] = [];
        let needsMigration = false;

        snapshot.forEach((docSnap) => {
          if (docSnap.id === 'data') {
            // Legacy single-document format — extract cards from the map
            const map = docSnap.data() || {};
            for (const val of Object.values(map)) {
              if (isValidCardModel(val)) allCards.push(val);
            }
            needsMigration = true;
          } else {
            // Individual document format
            const data = docSnap.data();
            if (isValidCardModel(data)) allCards.push(data as CardModel);
          }
        });

        // Deduplicate by cardId (during migration both formats may coexist)
        const seen = new Set<string>();
        const unique = allCards.filter((c) => {
          if (seen.has(c.cardId)) return false;
          seen.add(c.cardId);
          return true;
        });

        // Read-time compat: legacy records persisted `status: 'wanted'`.
        const normalized = unique.map((c) =>
          (c.status as unknown) === 'wanted' ? { ...c, status: 'wishlist' as const } : c,
        );
        const sortedCards = [...normalized].sort((a, b) =>
          a.pokemonData.name.localeCompare(b.pokemonData.name),
        );
        setCards(sortedCards);
        setLoading(false);

        // Kick off one-time migration in the background
        if (needsMigration) {
          migrateCardsToIndividualDocs().catch(console.error);
        }
      },
      (err) => {
        console.error('Error listening to cards', err);
        setError('Error fetching data');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return {
    cards: loading ? [] : cards,
    loading,
    error: error || null,
  };
}
