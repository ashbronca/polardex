import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { CardModel, isValidCardModel } from './cardModel';
import { firestore } from '../../../services/firebase.config';
import { migrateCardsToIndividualDocs } from '../../mutations';

interface CardsContextValue {
  cards: CardModel[];
  loading: boolean;
  error: string | null;
}

const CardsContext = createContext<CardsContextValue | null>(null);

/**
 * Holds the ONE live subscription to the `cards` collection for the whole app.
 * Previously every useGetCardsQuery() call opened its own onSnapshot listener,
 * so a page like Studio (plus the always-on milestone watcher) ran several
 * concurrent full-collection reads, re-sorted on every snapshot, and
 * re-subscribed on each route change (the routes are keyed by pathname).
 *
 * Mounted once near the app root, above the route-keyed container, so the
 * listener survives navigation. Consumers read the shared, normalized array.
 */
export function CardsProvider({ children }: { children: ReactNode }) {
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

        // One-time legacy migration, in the background. Fires once now that
        // there's a single subscription (was firing per-listener before).
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

  const value = useMemo<CardsContextValue>(
    () => ({ cards: loading ? [] : cards, loading, error: error || null }),
    [cards, loading, error],
  );

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCardsContext(): CardsContextValue {
  const ctx = useContext(CardsContext);
  if (!ctx) {
    throw new Error('useGetCardsQuery must be used within <CardsProvider>');
  }
  return ctx;
}
