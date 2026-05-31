import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { NavigationBar, PageFooter, PwaInstallBanner, CommandPalette, PriceCheck, Celebrate } from './components';
import { useKeyboardShortcut, useMilestones } from './hooks';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useToast } from './providers';
// Login screen is disabled — see AppContent below. Keep the import commented
// so it's easy to restore once Firebase auth is wired up for real.
// import { onAuthStateChanged } from 'firebase/auth';
// import { auth } from './services/firebase.config';

// Eager-load Home — it's the default landing route, no value in deferring it.
import { Home } from './pages';

// Lazy-load every other page so each becomes its own chunk and the initial JS
// bundle stays small. The named-export → default-export adapter is necessary
// because all the page modules use named exports and React.lazy requires default.
const Collections = lazy(() =>
  import('./pages/Collections/Collections').then((m) => ({ default: m.Collections })),
);
const CardDetail = lazy(() =>
  import('./pages/CardDetail/CardDetail').then((m) => ({ default: m.CardDetail })),
);
const Studio = lazy(() =>
  import('./pages/Studio/Studio').then((m) => ({ default: m.Studio })),
);
const Sets = lazy(() =>
  import('./pages/Sets/Sets').then((m) => ({ default: m.Sets })),
);
const Overview = lazy(() =>
  import('./pages/Overview/Overview').then((m) => ({ default: m.Overview })),
);
// const Login = lazy(() =>
//   import('./pages/Login/Login').then((m) => ({ default: m.Login })),
// );

const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${({ theme }) => theme.color.surface.base};
    color: ${({ theme }) => theme.color.text.primary};
    font-family: ${({ theme }) => theme.typography.family.primary};
    transition: background-color 200ms cubic-bezier(0.22, 1, 0.36, 1), color 200ms cubic-bezier(0.22, 1, 0.36, 1);
    /* Prevent rubber-band scroll revealing white edges on iOS */
    overscroll-behavior: none;
  }

  /* Native-app feel on mobile */
  @media (max-width: ${({ theme }) => theme.breakpoint.mobile}) {
    /* Disable callout on long-press for non-text elements */
    button, a, [role="button"] {
      -webkit-touch-callout: none;
      user-select: none;
    }
    /* Instant touch response — no 300ms click delay */
    * {
      touch-action: manipulation;
    }
  }

  /* ── SVG icon micro-interactions ───────────────────────────────────────── */
  button svg,
  a svg,
  [role="button"] svg,
  label[for] svg {
    transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
    will-change: transform;
    transform-origin: center;
  }

  /* Default: subtle scale */
  button:hover svg,
  a:hover svg,
  [role="button"]:hover svg {
    transform: scale(1.1);
  }

  button:active svg,
  a:active svg,
  [role="button"]:active svg {
    transform: scale(0.88);
    transition: transform 80ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  button:disabled svg {
    transform: none !important;
    transition: none !important;
  }

  /* Arrow right — nudge right */
  .icon-arr-r svg { transform-origin: center; }
  .icon-arr-r:hover:not(:disabled) svg { transform: translateX(3px) !important; }
  .icon-arr-r:active:not(:disabled) svg { transform: translateX(1px) scale(0.9) !important; }

  /* Arrow left — nudge left */
  .icon-arr-l svg { transform-origin: center; }
  .icon-arr-l:hover:not(:disabled) svg { transform: translateX(-3px) !important; }
  .icon-arr-l:active:not(:disabled) svg { transform: translateX(-1px) scale(0.9) !important; }

  /* Arrow down — nudge down */
  .icon-arr-d svg { transform-origin: center; }
  .icon-arr-d:hover:not(:disabled) svg { transform: translateY(3px) !important; }
  .icon-arr-d:active:not(:disabled) svg { transform: translateY(1px) scale(0.9) !important; }

  /* Close / X — rotate 90° */
  .icon-close:hover svg { transform: rotate(90deg) !important; }
  .icon-close:active svg { transform: rotate(90deg) scale(0.82) !important; }

  /* Respect the user's reduced-motion preference. Motion (framer) already
     honors it via MotionConfig reducedMotion='user', but raw CSS keyframes
     and transitions need this fallback. We slam durations to near-zero so
     animated states still reach their final value without the motion. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

const AppContainer = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.color.surface.base};
  transition: background-color 200ms cubic-bezier(0.22, 1, 0.36, 1);
`;

const Main = styled.main`
  flex: 1;

  @media (max-width: ${({ theme }) => theme.breakpoint.mobile}) {
    padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0px));
  }
`;

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

// Custom iOS-style easing — snappier than easeInOut
const pageTransition = { duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] as const };

// Suspense fallback while a lazy chunk is downloading. Kept deliberately
// minimal — the app shell (nav, footer) is already painted, so this only fills
// the page area for a few hundred ms during the first navigation to a chunk.
const RouteFallback = styled.div`
  min-height: 60dvh;
  background-color: ${({ theme }) => theme.color.surface.muted};
`;

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial='initial'
        animate='animate'
        exit='exit'
        transition={pageTransition}
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
            <Route path='/'        element={<Home />} />
            <Route path='/home'    element={<Home />} />
            <Route path='/collections' element={<Collections />} />
            <Route path='/collections/:cardId' element={<CardDetail />} />
            {/* Legacy redirect for old /gallery links */}
            <Route path='/gallery' element={<Collections />} />
            <Route path='/studio'  element={<Studio />} />
            <Route path='/sets'    element={<Sets />} />
            <Route path='/overview' element={<Overview />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

// Mounted only after auth is ready, so useGetCardsQuery inside useMilestones
// doesn't run against an unauthenticated Firestore.
function MilestoneWatcher() {
  const { celebrate, onDone } = useMilestones();
  return <Celebrate active={celebrate} onDone={onDone} />;
}

function AppContent() {
  const { toast } = useToast();

  // Login screen is commented out — the app lands straight on Home.
  // Guest session is set unconditionally so any legacy gate that reads it
  // still sees a "logged in" flag. Restore the Firebase auth path below when
  // real auth is wired up.
  if (sessionStorage.getItem('polardex_session') !== 'true') {
    sessionStorage.setItem('polardex_session', 'true');
  }

  // Command palette — ⌘K / Ctrl+K to toggle open, Escape to close
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const openCmdk = useCallback(() => setCmdkOpen(true), []);
  useKeyboardShortcut('k', openCmdk, { meta: true, ignoreInInputs: false });

  // Price check ("Rare Candy") — ⌘P / Ctrl+P
  const [priceCheckOpen, setPriceCheckOpen] = useState(false);
  const openPriceCheck = useCallback((e?: KeyboardEvent) => {
    e?.preventDefault(); // suppress browser's Print dialog
    setPriceCheckOpen(true);
  }, []);
  useKeyboardShortcut('p', openPriceCheck, { meta: true, ignoreInInputs: false });

  // Listen for the cross-component open-price-check event fired by CommandPalette
  useEffect(() => {
    const handler = () => setPriceCheckOpen(true);
    window.addEventListener('polardex:open-price-check', handler);
    return () => window.removeEventListener('polardex:open-price-check', handler);
  }, []);

  // Firebase auth gate — disabled while the login screen is commented out.
  // useEffect(() => {
  //   if (sessionReady) return;
  //   const unsub = onAuthStateChanged(auth, (user) => {
  //     if (user) {
  //       setSessionReady(true);
  //     } else {
  //       navigate('/login', { replace: true });
  //     }
  //     unsub();
  //   });
  //   return unsub;
  // }, []);

  // Surface a toast whenever a mutation is blocked because the session is
  // in read-only mode. The write itself is a no-op in mutations.ts.
  useEffect(() => {
    const handler = () => {
      toast({
        message: "Locked mode — changes can't be saved",
        tone: 'warning',
      });
    };
    window.addEventListener('polardex:readonly-blocked', handler);
    return () => window.removeEventListener('polardex:readonly-blocked', handler);
  }, [toast]);

  return (
    <MotionConfig reducedMotion='user'>
      <GlobalStyle />
      <AppContainer>
        <NavigationBar />
        <Main>
          <AnimatedRoutes />
        </Main>
        <PageFooter />
        <PwaInstallBanner />
        <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
        <PriceCheck open={priceCheckOpen} onClose={() => setPriceCheckOpen(false)} />
        <MilestoneWatcher />
      </AppContainer>
    </MotionConfig>
  );
}

export function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
