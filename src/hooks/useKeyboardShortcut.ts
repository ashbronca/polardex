import { useEffect } from 'react';

/**
 * Simple keyboard shortcut hook. Listens on the window for keydown events
 * and fires the callback when the keyboard combo matches.
 *
 * - Ignores events fired inside inputs/textareas/contenteditable (so typing
 *   a letter in the search bar doesn't also fire the "n" shortcut).
 * - Supports modifier keys via the options object.
 *
 *   useKeyboardShortcut('/', () => searchRef.current?.focus());
 *   useKeyboardShortcut('n', () => openAdd(), { ignoreInInputs: true });
 *   useKeyboardShortcut('k', () => openPalette(), { meta: true });
 */

interface Options {
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Skip the handler when focus is inside an input/textarea. Default true. */
  ignoreInInputs?: boolean;
  /** Skip the handler entirely (useful when a modal is open). */
  disabled?: boolean;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useKeyboardShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  options: Options = {},
): void {
  const { meta, ctrl, shift, alt, ignoreInInputs = true, disabled } = options;

  useEffect(() => {
    if (disabled) return;

    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (meta && !(e.metaKey || e.ctrlKey)) return;
      if (ctrl && !e.ctrlKey) return;
      if (shift !== undefined && e.shiftKey !== shift) return;
      if (alt !== undefined && e.altKey !== alt) return;
      if (ignoreInInputs && isEditable(e.target)) return;
      handler(e);
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Depend on the option primitives rather than the (usually inline, new-each-
    // render) options object, so we don't re-bind the listener every render.
  }, [key, handler, meta, ctrl, shift, alt, ignoreInInputs, disabled]);
}
