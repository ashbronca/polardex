import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { ReadOnlyProvider } from './ReadOnlyProvider';
import { ToastProvider } from './ToastProvider';
import { CardsProvider } from '../api';

export function PolardexProviders({ children }: { children: ReactNode }) {
  return (
    <ReadOnlyProvider>
      <ThemeProvider>
        <ToastProvider>
          <CardsProvider>{children}</CardsProvider>
        </ToastProvider>
      </ThemeProvider>
    </ReadOnlyProvider>
  );
}
