import { useEffect, useState } from 'react';
import { PokemonModel } from './pokemonModel';
import { pokemonRowToModel, PokemonRow } from '../card/cardRow';
import { supabase } from '../../../services/supabase.config';

export function useGetPokemonQuery() {
  const [pokemon, setPokemon] = useState<PokemonModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error: err } = await supabase.from('pokemon').select('*');

      if (err) {
        console.error('Error fetching pokemon', err);
        setError('Error fetching data');
      } else {
        setPokemon(((data ?? []) as PokemonRow[]).map(pokemonRowToModel));
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return {
    pokemon: loading || error ? [] : pokemon,
    loading,
    error: error || null,
  };
}
