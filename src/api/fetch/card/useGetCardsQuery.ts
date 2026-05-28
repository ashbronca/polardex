import { useEffect, useState } from 'react';
import { CardModel } from './cardModel';
import { CardRow, cardRowToModel } from './cardRow';
import { supabase } from '../../../services/supabase.config';

/**
 * Loads every card joined with its pokemon, reshapes each row back into the
 * app's CardModel, and keeps the list live via Supabase realtime (replaces the
 * Firestore onSnapshot listener). Return shape is unchanged from the Firestore
 * version so no consumer needs to change.
 */
export function useGetCardsQuery() {
  const [cards, setCards] = useState<CardModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchCards = async () => {
      const { data, error: err } = await supabase
        .from('cards')
        .select('*, pokemon(*)');

      if (!active) return;

      if (err) {
        console.error('Error fetching cards', err);
        setError('Error fetching data');
        setLoading(false);
        return;
      }

      const models = ((data ?? []) as CardRow[]).map(cardRowToModel);
      const sorted = [...models].sort((a, b) =>
        a.pokemonData.name.localeCompare(b.pokemonData.name),
      );
      setCards(sorted);
      setError(null);
      setLoading(false);
    };

    fetchCards();

    // Realtime: any insert/update/delete on cards re-pulls the joined list.
    const channel = supabase
      .channel('cards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, () => {
        fetchCards();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    cards: loading ? [] : cards,
    loading,
    error: error || null,
  };
}
