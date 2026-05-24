import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

interface ReadOnlyContextValue {
  isReadOnly: boolean;
  toggle: () => void;
}

const ReadOnlyContext = createContext<ReadOnlyContextValue>({
  isReadOnly: true,
  toggle: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useReadOnly = () => useContext(ReadOnlyContext);

// Default every session to locked so mutations.ts (which reads sessionStorage
// directly) sees the lock before any React render runs.
if (typeof sessionStorage !== 'undefined') {
  sessionStorage.setItem('polardex_readonly', 'true');
}

export function ReadOnlyProvider({ children }: { children: ReactNode }) {
  const [isReadOnly, setIsReadOnly] = useState(true);

  const toggle = useCallback(() => {
    setIsReadOnly((prev) => {
      const next = !prev;
      if (next) sessionStorage.setItem('polardex_readonly', 'true');
      else sessionStorage.removeItem('polardex_readonly');
      return next;
    });
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + Shift + L
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  return (
    <ReadOnlyContext.Provider value={{ isReadOnly, toggle }}>
      {children}
    </ReadOnlyContext.Provider>
  );
}
