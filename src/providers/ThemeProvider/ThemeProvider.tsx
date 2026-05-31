import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from '../../theme';

interface ThemeModeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  isDark: false,
  toggle: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useThemeMode = () => useContext(ThemeModeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('polardex-theme');
    if (stored) return stored === 'dark';
    return true; // default to dark
  });

  useEffect(() => {
    localStorage.setItem('polardex-theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((d) => !d), []);
  const value = useMemo(() => ({ isDark, toggle }), [isDark, toggle]);

  return (
    <ThemeModeContext.Provider value={value}>
      <StyledThemeProvider theme={isDark ? darkTheme : lightTheme}>
        {children}
      </StyledThemeProvider>
    </ThemeModeContext.Provider>
  );
}
