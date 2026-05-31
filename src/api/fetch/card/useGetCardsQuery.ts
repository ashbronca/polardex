import { useCardsContext } from './CardsProvider';

/**
 * Returns the shared `{ cards, loading, error }` from the single app-wide
 * CardsProvider subscription. Same shape as the previous per-call onSnapshot
 * version, so no consumer needs to change — but there's now exactly one
 * Firestore listener for the whole app.
 */
export function useGetCardsQuery() {
  return useCardsContext();
}
