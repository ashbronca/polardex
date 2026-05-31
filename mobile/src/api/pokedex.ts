import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PokedexEntry {
  name: string;        // "charizard"
  displayName: string; // "Charizard"
  id: number;
  spriteUrl: string;
}

const CACHE_KEY = 'polardex_pokedex_list_v1';
const TTL = 7 * 24 * 60 * 60 * 1000;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

let listPromise: Promise<PokedexEntry[]> | null = null;

async function loadAll(): Promise<PokedexEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const { entries, timestamp } = JSON.parse(raw) as { entries: PokedexEntry[]; timestamp: number };
      if (Date.now() - timestamp < TTL) return entries;
    }
  } catch {
    /* fall through to fetch */
  }
  if (!listPromise) {
    listPromise = (async () => {
      try {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0');
        const json = (await res.json()) as { results: { name: string; url: string }[] };
        const entries: PokedexEntry[] = json.results.map((p) => {
          const parts = p.url.split('/').filter(Boolean);
          return {
            name: p.name,
            displayName: p.name.split('-').map(cap).join(' '),
            id: Number(parts[parts.length - 1]),
            spriteUrl: `https://img.pokemondb.net/sprites/home/normal/${p.name}.png`,
          };
        });
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ entries, timestamp: Date.now() })).catch(() => {});
        return entries;
      } catch {
        return [];
      } finally {
        listPromise = null;
      }
    })();
  }
  return listPromise;
}

/** Loads the full pokédex once; filter client-side by query. */
export function usePokedex() {
  const [list, setList] = useState<PokedexEntry[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadAll().then((l) => {
      if (cancelled) return;
      setList(l);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);
  return { list, ready };
}

export function searchPokedex(list: PokedexEntry[], query: string, limit = 8): PokedexEntry[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '-');
  if (!q) return [];
  return list
    .filter((p) => p.name.startsWith(q) || p.displayName.toLowerCase().startsWith(query.trim().toLowerCase()))
    .slice(0, limit);
}
