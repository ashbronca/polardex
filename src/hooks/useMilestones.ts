import { useEffect, useRef, useState } from 'react';
import { useGetCardsQuery } from '../api';
import { useToast } from '../providers/ToastProvider';

/**
 * Watches the user's collection for milestone moments and returns a boolean
 * that flips to `true` each time a celebration should fire. App.tsx wires
 * this to the <Celebrate /> component.
 *
 * Milestones (each fires once per browser profile, persisted in localStorage):
 *   - First card ever added
 *   - Reaching 10 / 50 / 100 / 500 / 1000 cards
 *
 * We deliberately don't fire on initial page load — only on transitions that
 * happen while the user is actively using the app.
 */

const STORAGE_KEY = 'polardex_milestones_fired';
const CARD_MILESTONES = [1, 10, 50, 100, 500, 1000];

function loadFired(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveFired(fired: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...fired]));
  } catch {
    // storage unavailable — ignore
  }
}

export function useMilestones() {
  const { cards, loading } = useGetCardsQuery();
  const { toast } = useToast();
  const [celebrate, setCelebrate] = useState(false);
  const firedRef = useRef<Set<string>>(loadFired());
  const hydratedRef = useRef(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    // Wait for the first LOADED snapshot before hydrating — otherwise the
    // initial 0 → N jump (cards arriving) would fire every milestone at once.
    if (loading) return;

    const count = cards.length;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      prevCountRef.current = count;
      return;
    }

    for (const milestone of CARD_MILESTONES) {
      const key = `cards-${milestone}`;
      if (firedRef.current.has(key)) continue;
      if (prevCountRef.current < milestone && count >= milestone) {
        firedRef.current.add(key);
        saveFired(firedRef.current);
        setCelebrate(true);
        const label =
          milestone === 1
            ? 'First card added!'
            : `${milestone} cards collected!`;
        toast({ message: label, tone: 'success' });
      }
    }
    prevCountRef.current = count;
  }, [cards.length, loading, toast]);

  const onDone = () => setCelebrate(false);
  return { celebrate, onDone };
}
