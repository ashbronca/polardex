import { useEffect, useRef, useState } from 'react';

/**
 * Renders a large list incrementally. Returns the first `step` items plus a
 * sentinel ref to place just after the list; when the sentinel scrolls near the
 * viewport the window grows by another `step`. Resets to the first window when
 * the list identity changes (switching sets, searching, filtering), so only
 * ~`step` nodes mount at a time instead of hundreds of motion components.
 *
 * Counts/empty-states should keep reading the FULL list — only feed `visible`
 * to the rendered `.map()`.
 */
export function useIncrementalReveal<T>(items: T[], step = 60, resetKey?: unknown) {
  const [count, setCount] = useState(step);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset to the first window when the *context* changes (set switch / search /
  // filter), keyed by `resetKey`. Falls back to the array identity when no key
  // is given. Using resetKey avoids snapping back to the first window when the
  // list merely GROWS (e.g. background-paginated data appending).
  const resetDep = resetKey !== undefined ? resetKey : items;
  useEffect(() => {
    setCount(step);
  }, [resetDep, step]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCount((c) => (c < items.length ? c + step : c));
        }
      },
      { rootMargin: '600px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [items.length, step]);

  return {
    visible: count >= items.length ? items : items.slice(0, count),
    hasMore: count < items.length,
    sentinelRef,
  };
}
