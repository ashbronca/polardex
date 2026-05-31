import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { PolardexProviders } from './providers';
import './index.css';

// When a freshly-deployed service worker takes control, reload once so the new
// app shell (and JS) is used immediately. Without this, the SW keeps serving the
// previously-cached build until a manual hard-reload — which makes deploys look
// like they "didn't take".
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PolardexProviders>
      <App />
    </PolardexProviders>
  </StrictMode>
);
