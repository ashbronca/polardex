# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Type-check (tsc -b) then bundle (vite build) → dist/
npm run lint      # Run ESLint across the project
npm run preview   # Preview the production build locally
```

There is no test suite. Deploy via Firebase Hosting (`dist/` is the publish dir).

## Architecture

**Polardex** is a Pokémon TCG card collection tracker. Stack: React 18 + TypeScript + Styled Components + Firebase (Firestore + Auth) + Motion for React (`motion/react`).

### Data Flow

```
React Router v6 (/, /home, /gallery, /studio, /sets, /overview, /login)
  └── PolardexProviders (ThemeProvider — light/dark)
        └── App (BrowserRouter → AppContent → AnimatedRoutes)
              └── Pages → Components → API hooks → Firebase Firestore
```

Auth gate in `AppContent`: checks Firebase Auth state on load; unauthenticated users are redirected to `/login`. Guest access stores `polardex_session=true` in `sessionStorage` and bypasses Firebase auth.

### Firestore Collections

- `cards/{cardId}` — one document per card (`CardModel`). Migrated from a legacy single-document format (`cards/data`) to avoid Firestore's 40k index-entry-per-document limit. A one-time migration in `mutations.ts` runs automatically if the old `cards/data` document is detected.
- `pokemon/data` — single document, Pokémon metadata map
- `attributes/data` — single document, `Record<id, AttributeModel>` — card set attributes

Card mutations (`src/api/mutations.ts`) use `setDoc` to add/update individual card documents and `deleteDoc` to remove. Attribute mutations still use `setDoc(..., { merge: true })` on the single `attributes/data` document.

### API Layer

**Firestore hooks** (`src/api/fetch/`) — `useGetCardsQuery` listens to the `cards` collection (all documents), while `useGetPokemonQuery` and `useGetAttributesQuery` each read from `doc(firestore, '<collection>', 'data')`. All return typed arrays.

**External APIs** (no auth key required in client):
- **Pokémon TCG API** (`src/api/tcg/`) — `https://api.pokemontcg.io/v2` — fetches sets and card artwork. Results cached in `localStorage` (`polardex_sets_v1`) with a 24-hour TTL.
- **PokeAPI** (`src/api/pokeapi/`) — used for Pokémon search/lookup.
- **PokemonDB sprites** — fallback image URL pattern: `https://img.pokemondb.net/sprites/home/normal/${toSpriteName(name)}.png`

### State Management

Context-only — `PolardexProviders` wraps `ThemeProvider` and `ReadOnlyProvider`. There is no Redux/Zustand.

### Read-Only Mode

`ReadOnlyProvider` (`src/providers/ReadOnlyProvider.tsx`) exposes `useReadOnly()` returning `{ isReadOnly, toggle }`. Toggled via `Cmd/Ctrl + Shift + L`, persisted in `sessionStorage` (`polardex_readonly`). Mutation entry points should check `isReadOnly` and no-op when true.

### Pricing & Currency

- `useTcgPrices(tcgIds)` (`src/api/tcg/useTcgPrices.ts`) — batch-fetches TCGPlayer market prices in chunks of 50 via the Pokémon TCG API, cached in `localStorage` (`polardex_prices_v2`, 24h TTL). Only fetches IDs missing from cache. Picks first available variant: normal → holofoil → reverseHolofoil → 1stEditionHolofoil → 1stEditionNormal.
- `useAudRate()` (`src/hooks/useAudRate.ts`) — live USD→AUD rate from `open.er-api.com`, cached in `sessionStorage` (`polardex_aud_rate`, 6h TTL), fallback `1.55`.
- `useCurrency()` (`src/hooks/useCurrency.ts`) — toggle between `'AUD'` and `'USD'`, persisted in `localStorage` (`polardex_currency`). Use `fmtPrice(usd, currency, audRate)` to format.

All upstream prices are USD; convert at render time, never store AUD.

### Theme System (`src/theme/theme.ts`)

Semantic token system with `lightTheme` and `darkTheme`. Access tokens via `${({ theme }) => theme.<token>}` in styled components. Type augmentation is in `src/styled-components.d.ts`.

Token namespaces:
- `theme.color.surface.*` — `base`, `subtle`, `muted`, `footer`, `border`
- `theme.color.text.*` — `primary`, `secondary`, `tertiary`, `primaryHover`, `secondaryHover`
- `theme.color.frost.*` — `teal`, `sky`, `blue`, `deep` (Nord-inspired blues)
- `theme.color.aurora.*` — `red`, `orange`, `yellow`, `green`, `purple` (warm accents)
- `theme.space.*` — `1`–`20` (4px base unit, Tailwind-style scale, values are rem strings)
- `theme.radius.*` — `none`, `sm`, `md`, `lg`, `xl`, `full`
- `theme.shadow.*` / `theme.dropShadow.*` — box shadow and CSS filter shadows
- `theme.typography.{family,size,weight,lineHeight,letterSpacing}`
- `theme.zIndex.*` — `base(0)`, `raised(1)`, `dropdown(3)`, `sticky(5)`, `modal(10)`, `overlay(20)`
- `theme.transition.*` — `fast(150ms)`, `normal(300ms)`, `slow(1s)`, `spring`
- `theme.breakpoint.*` — `sm(36em)`, `md(56.25em / 900px)`, `lg(75em)` — use in media queries

### Animation

Uses `motion/react` (Motion for React — **not** `framer-motion`). Global SVG micro-interaction classes are defined in `GlobalStyle` in `App.tsx`: add `className='icon-close'`, `icon-arr-r`, `icon-arr-l`, `icon-arr-d` to buttons to get consistent icon animations.

### Icons

`@tabler/icons-react` — e.g. `<IconX />`, `<IconCheck />`, `<IconArrowRight />`.

### Studio Page (CRUD)

`/studio` is the card editor. `StudioModal` orchestrates three action types: `add`, `modify`, `attribute`. It renders a split layout — `StudioModalDialog` (form, left pane) + `StudioModalCanvas` (live card preview, right pane, hidden on mobile). `CardDraft` is the local editing type; `draftToCard` / `cardToDraft` convert between draft and `CardModel`.

### TypeScript Config

Strict mode: `strict: true`, `noUnusedLocals`, `noUnusedParameters`. Target ES2020, module resolution `bundler`.
