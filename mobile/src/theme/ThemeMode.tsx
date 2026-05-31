import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider as SCThemeProvider } from 'styled-components/native';

import { darkTheme, lightTheme } from './theme';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'polardex_theme_mode';

interface ThemeModeValue {
  mode: ThemeMode; // user's choice
  effective: 'light' | 'dark'; // resolved scheme actually in use
  setMode: (m: ThemeMode) => void;
  cycle: () => void; // system → light → dark → system
}

const ThemeModeContext = createContext<ThemeModeValue | null>(null);

export function useThemeMode(): ThemeModeValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}

/**
 * Owns the light/dark choice. `system` follows the OS; `light`/`dark` override
 * it. The choice is persisted, and this provider supplies the resolved theme to
 * styled-components so the whole app re-themes instantly on change.
 */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'system' || v === 'light' || v === 'dark') setModeState(v);
    });
  }, []);

  const value = useMemo<ThemeModeValue>(() => {
    const setMode = (m: ThemeMode) => {
      setModeState(m);
      AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
    };
    const effective: 'light' | 'dark' =
      mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
    return {
      mode,
      effective,
      setMode,
      cycle: () => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'),
    };
  }, [mode, system]);

  const theme = value.effective === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeModeContext.Provider value={value}>
      <SCThemeProvider theme={theme}>{children}</SCThemeProvider>
    </ThemeModeContext.Provider>
  );
}
