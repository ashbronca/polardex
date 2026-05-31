import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
import { useToast } from '../../providers/ToastProvider';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { hoverLiftLg, tapPress, tapPressFirm, tapPressSoft, easeOut, easeInOut } from '../../theme/motion';
import { useTheme } from 'styled-components';
import { IconSearch, IconX, IconChevronLeft, IconPackage, IconPlus, IconSortAscending, IconSortDescending, IconRefresh, IconEye, IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { SectionWrapper } from '../Home/sections/sectionStyles';
import { usePokemonSetsQuery } from '../../api/tcg/usePokemonSetsQuery';
import { useUpcomingSetsQuery } from '../../api/tcg/useUpcomingSetsQuery';
import {
  HeroCard,
  HeroStatsRow,
  HeroStat,
  HeroStatValue,
  HeroStatLabel,
  HeroProgressBar,
  HeroProgressFill,
} from '../../components/HeroCard';
import { usePokemonSetCardsQuery } from '../../api/tcg/usePokemonSetCardsQuery';
import { useTcgPrices } from '../../api/tcg/useTcgPrices';
import { useGetCardsQuery } from '../../api';
import { TcgSet, TcgCard } from '../../api/tcg/types';
import { saveCard, generateCardId, removeCard } from '../../api/mutations';
import { useReadOnly } from '../../providers';
import { useAudRate } from '../../hooks/useAudRate';
import { useCurrency, fmtPrice } from '../../hooks/useCurrency';
import { useIncrementalReveal } from '../../hooks/useIncrementalReveal';
import { toSpriteName } from '../../utils';
import { CardModel } from '../../api/fetch/card/cardModel';

// ── Shell ─────────────────────────────────────────────────────────────────────

const Main = styled.main`
  background-color: ${({ theme }) => theme.color.surface.muted};
  min-height: 60dvh;
  transition: background-color 200ms cubic-bezier(0.22, 1, 0.36, 1);
`;

// ── Page header ───────────────────────────────────────────────────────────────

const PageHeader = styled.div`
  padding: ${({ theme }) => `${theme.space[6]} 0 ${theme.space[2]}`};
`;

// Sets list summary uses the shared HeroCard primitives — see components/HeroCard.

const SyncIconBtn = styled(motion.button)<{ $loading: boolean }>`
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.surface.subtle};
  border: 1.5px solid ${({ theme }) => theme.color.surface.border};
  color: ${({ theme }) => theme.color.text.secondary};
  cursor: ${({ $loading }) => ($loading ? 'default' : 'pointer')};
  opacity: ${({ $loading }) => ($loading ? 0.55 : 1)};
  transition: all 180ms cubic-bezier(0.22, 1, 0.36, 1);
  flex-shrink: 0;

  svg {
    animation: ${({ $loading }) => ($loading ? spin : 'none')} 0.9s linear infinite;
  }

  @media (max-width: ${({ theme }) => theme.breakpoint.mobile}) {
    display: flex;
  }
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.size.xxl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.color.text.primary};
  margin: 0 0 ${({ theme }) => theme.space[1]} 0;
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.size.md};
  color: ${({ theme }) => theme.color.text.secondary};
  margin: 0;
`;

// ── Search bar ────────────────────────────────────────────────────────────────

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  margin: ${({ theme }) => `${theme.space[4]} 0`};
`;

const SearchIcon = styled.span`
  position: absolute;
  left: ${({ theme }) => theme.space[4]};
  color: ${({ theme }) => theme.color.text.secondary};
  display: flex;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  height: 2.75rem;
  padding: 0 ${({ theme }) => theme.space[8]};
  box-sizing: border-box;
  border: none;
  border-radius: ${({ theme }) => theme.radius.full};
  background-color: ${({ theme }) => theme.color.surface.subtle};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-family: inherit;
  outline: none;
  box-shadow: 0 0 0 1.5px ${({ theme }) => theme.color.surface.muted};
  transition: box-shadow 150ms cubic-bezier(0.22, 1, 0.36, 1), background-color 200ms cubic-bezier(0.22, 1, 0.36, 1);

  &::placeholder { color: ${({ theme }) => theme.color.text.secondary}; }
  &:focus {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.frost.blue};
    background-color: ${({ theme }) => theme.color.surface.base};
  }
`;

const ClearBtn = styled(motion.button)`
  position: absolute;
  right: ${({ theme }) => theme.space[3]};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.surface.muted};
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text.secondary};
  width: 1.5rem;
  height: 1.5rem;
  border-radius: ${({ theme }) => theme.radius.full};
`;

// ── Search mode toggle ────────────────────────────────────────────────────────

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  margin: ${({ theme }) => `${theme.space[4]} 0`};
`;

const ModeToggle = styled.div`
  display: flex;
  flex-shrink: 0;
  background: ${({ theme }) => theme.color.surface.subtle};
  border-radius: ${({ theme }) => theme.radius.full};
  box-shadow: 0 0 0 1.5px ${({ theme }) => theme.color.surface.border};
  padding: 3px;
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const SyncBtn = styled.button<{ $loading: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border: 1.5px solid ${({ theme }) => theme.color.surface.border};
  border-radius: ${({ theme }) => theme.radius.full};
  background: transparent;
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  font-family: inherit;
  cursor: ${({ $loading }) => ($loading ? 'default' : 'pointer')};
  flex-shrink: 0;
  opacity: ${({ $loading }) => ($loading ? 0.55 : 1)};
  transition: border-color 150ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms cubic-bezier(0.22, 1, 0.36, 1);

  svg {
    animation: ${({ $loading }) => ($loading ? spin : 'none')} 0.9s linear infinite;
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.color.frost.blue};
    color: ${({ theme }) => theme.color.frost.blue};
  }

  /* On mobile, the icon-only SyncIconBtn is rendered instead */
  @media (max-width: ${({ theme }) => theme.breakpoint.mobile}) {
    display: none;
  }
`;

const SortBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border: 1.5px solid ${({ theme }) => theme.color.surface.border};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.surface.subtle};
  color: ${({ theme }) => theme.color.text.secondary};
  cursor: pointer;
  transition: border-color 150ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms cubic-bezier(0.22, 1, 0.36, 1), background 150ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    border-color: ${({ theme }) => theme.color.frost.blue};
    color: ${({ theme }) => theme.color.frost.blue};
    background: ${({ theme }) => `${theme.color.frost.blue}12`};
  }
`;

const ModeBtn = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border: none;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $active, theme }) => $active ? theme.color.frost.blue : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background 150ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms cubic-bezier(0.22, 1, 0.36, 1);
`;

// ── Series filter pills ───────────────────────────────────────────────────────

const PillRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]};
  overflow-x: auto;
  padding: ${({ theme }) => `${theme.space[1]} 0 ${theme.space[3]}`};
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Pill = styled(motion.button) <{ $active: boolean }>`
  flex-shrink: 0;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[4]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  border: none;
  background-color: ${({ $active, theme }) =>
    $active ? theme.color.frost.blue : theme.color.surface.subtle};
  color: ${({ $active, theme }) =>
    $active ? '#ffffff' : theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.weight.semibold : theme.typography.weight.medium};
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: ${({ $active, theme }) =>
    $active
      ? `0 2px 8px ${theme.color.frost.blue}40`
      : `0 0 0 1.5px ${theme.color.surface.muted}`};
  transition: background-color 150ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 150ms cubic-bezier(0.22, 1, 0.36, 1);
`;

// ── Sets grid ─────────────────────────────────────────────────────────────────

const SetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(16rem, 100%), 1fr));
  gap: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => `${theme.space[2]} 0 ${theme.space[8]}`};
`;

const SetCard = styled(motion.button)`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface.base};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  border: none;
  cursor: pointer;
  text-align: left;
  transition: box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1);
  width: 100%;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.md};
  }
`;

const SetLogo = styled.img`
  height: 2.5rem;
  object-fit: contain;
  max-width: 100%;
`;

const SetLogoFallback = styled.div`
  height: 2.5rem;
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.color.text.tertiary};
`;

// Wraps the set logo inside a circular progress arc
const LogoRingWrap = styled.div`
  position: relative;
  width: 5.25rem;
  height: 5.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Isolate compositing so parent hover/tap transforms can't subtly re-raster the stroke */
  transform: translateZ(0);
  backface-visibility: hidden;
`;

const LogoRingSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* NOTE: no CSS transform here. The -90° rotation is applied per-circle as an SVG
     attribute so it's evaluated in user coordinate space and CANNOT stack with any
     CSS transforms on ancestors (which was the root cause of the hover/tap
     "moving progress bar" bug). */
  overflow: visible;
`;

const LogoRingInner = styled.div`
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surface.subtle};
`;

const LogoRing = memo(function LogoRing({ pct, children }: { pct: number; children: React.ReactNode }) {
  const size = 84;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = c - (clamped / 100) * c;
  const color = pct === 100 ? '#a3be8c' : pct > 0 ? '#88c0d0' : 'transparent';
  const center = size / 2;
  // SVG-native rotation: turns the starting point of the arc from 3 o'clock
  // to 12 o'clock. Applied to the circle in the element's OWN coordinate space,
  // so parent CSS transforms (hover/tap) can't compound with this.
  const rotate = `rotate(-90 ${center} ${center})`;
  return (
    <LogoRingWrap>
      <LogoRingSvg viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill='none'
          stroke='rgba(128,128,128,0.18)'
          strokeWidth={stroke}
          vectorEffect='non-scaling-stroke'
        />
        {pct > 0 && (
          <circle
            cx={center}
            cy={center}
            r={r}
            fill='none'
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap='round'
            strokeDasharray={c}
            strokeDashoffset={offset}
            vectorEffect='non-scaling-stroke'
            transform={rotate}
          />
        )}
      </LogoRingSvg>
      <LogoRingInner>{children}</LogoRingInner>
    </LogoRingWrap>
  );
});

const SetInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SetName = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.color.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SetMeta = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
  margin-top: ${({ theme }) => theme.space[1]};
`;

const SetFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: auto;
`;

const CardCount = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
`;

const CollectionBadge = styled.span<{ $pct: number }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ $pct, theme }) =>
    $pct === 100
      ? theme.color.aurora.green
      : $pct > 0
        ? theme.color.frost.blue
        : theme.color.text.secondary};
  background: ${({ $pct, theme }) =>
    $pct === 100
      ? `${theme.color.aurora.green}18`
      : $pct > 0
        ? `${theme.color.frost.blue}15`
        : `${theme.color.aurora.orange}15`};
  border: 1px solid ${({ $pct, theme }) =>
    $pct === 0 ? `${theme.color.aurora.orange}30` : 'transparent'};
  padding: ${({ theme }) => `2px ${theme.space[2]}`};
  border-radius: ${({ theme }) => theme.radius.full};
`;

// ── Upcoming sets strip ───────────────────────────────────────────────────────

const UpcomingSection = styled.div`
  margin: ${({ theme }) => `${theme.space[2]} 0 ${theme.space[4]}`};
  padding: ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(135deg,
    ${({ theme }) => `${theme.color.frost.deep}10`} 0%,
    ${({ theme }) => `${theme.color.aurora.purple}10`} 100%);
  border: 1px solid ${({ theme }) => `${theme.color.frost.deep}35`};
  backdrop-filter: blur(8px);
`;

const UpcomingHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.space[3]};
`;

const UpcomingTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.color.text.primary};
  margin: 0;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
`;

const PulseDot = styled(motion.span)`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.aurora.purple};
  box-shadow: 0 0 10px ${({ theme }) => theme.color.aurora.purple};
`;

const UpcomingStrip = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]};
  overflow-x: auto;
  padding-bottom: ${({ theme }) => theme.space[1]};
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.color.frost.blue}55`} transparent;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => `${theme.color.frost.blue}55`};
    border-radius: 2px;
  }
`;

const UpcomingCard = styled(motion.div)`
  flex-shrink: 0;
  min-width: 12rem;
  max-width: 14rem;
  padding: ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface.base};
  border: 1px solid ${({ theme }) => theme.color.surface.border};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), border-color 200ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.color.frost.blue};
  }
`;

const UpcomingCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
`;

const UpcomingName = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.color.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UpcomingSeries = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
`;

const UpcomingDate = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.tertiary};
  font-variant-numeric: tabular-nums;
`;

const UpcomingBadge = styled.span<{ $rumored: boolean }>`
  padding: 2px ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.typography.size.xxs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: ${({ $rumored, theme }) =>
    $rumored ? `${theme.color.aurora.purple}22` : `${theme.color.frost.teal}22`};
  color: ${({ $rumored, theme }) =>
    $rumored ? theme.color.aurora.purple : theme.color.frost.teal};
  border: 1px solid ${({ $rumored, theme }) =>
    $rumored ? `${theme.color.aurora.purple}55` : `${theme.color.frost.teal}55`};
  white-space: nowrap;
  flex-shrink: 0;
`;

function formatUpcomingDate(iso: string): string {
  // Input: "YYYY/MM/DD"
  const parsed = Date.parse(iso.replace(/\//g, '-'));
  if (!Number.isFinite(parsed)) return iso;
  const d = new Date(parsed);
  const diffDays = Math.round((parsed - Date.now()) / (1000 * 60 * 60 * 24));
  const nice = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (diffDays <= 0) return nice;
  if (diffDays <= 30) return `${nice} · ${diffDays}d`;
  return nice;
}

// ── Set detail hero — unified across viewports ──────────────────────────────

// Set-detail specific subcomponents — the rest of the hero uses shared HeroCard primitives.

const DetailHeroLogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
  position: relative;
  z-index: 1;
`;

const DetailHeroLogoBubble = styled.div`
  flex-shrink: 0;
  width: 4.5rem;
  height: 4.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.surface.base};
  border: 1px solid ${({ theme }) => theme.color.surface.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.space[2]};

  @media (min-width: calc(${({ theme }) => theme.breakpoint.mobile} + 1px)) {
    width: 6rem;
    height: 6rem;
    padding: ${({ theme }) => theme.space[3]};
  }
`;

const DetailHeroLogoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const DetailHeroNameBlock = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DetailHeroName = styled.h1`
  font-size: 1.25rem;
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.color.text.primary};
  margin: 0;
  line-height: 1.15;
  letter-spacing: -0.01em;

  @media (min-width: calc(${({ theme }) => theme.breakpoint.mobile} + 1px)) {
    font-size: 1.75rem;
  }
`;

const DetailHeroSubtitle = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
  font-variant-numeric: tabular-nums;
`;

// Unified back button — same on both viewports, sits above the hero card.
const DetailBackBtn = styled.button`
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]} ${theme.space[1]} ${theme.space[2]}`};
  border: 1.5px solid ${({ theme }) => theme.color.surface.border};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.surface.subtle};
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-family: inherit;
  cursor: pointer;
  margin: ${({ theme }) => `${theme.space[5]} 0 0`};
  transition: border-color 180ms cubic-bezier(0.22, 1, 0.36, 1), color 180ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    border-color: ${({ theme }) => theme.color.frost.blue};
    color: ${({ theme }) => theme.color.frost.blue};
  }
`;


const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: ${({ theme }) => theme.space[3]};
  padding-bottom: ${({ theme }) => theme.space[8]};

  @media (min-width: ${({ theme }) => theme.breakpoint.md}) {
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  }
`;

const TcgCardItem = styled(motion.div) <{ $owned: boolean; $wanted?: boolean }>`
  position: relative;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  background: ${({ theme }) => theme.color.surface.subtle};
  box-shadow: ${({ $owned, $wanted, theme }) =>
    $owned
      ? `0 0 0 2.5px ${theme.color.frost.blue}, ${theme.shadow.sm}`
      : $wanted
        ? `0 0 0 2.5px ${theme.color.aurora.red}, ${theme.shadow.sm}`
        : theme.shadow.sm};
  cursor: ${({ $owned }) => ($owned ? 'default' : 'pointer')};
`;

const WishlistRibbon = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space[2]};
  left: ${({ theme }) => theme.space[2]};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => `${theme.color.aurora.red}e6`};
  color: #fff;
  font-size: ${({ theme }) => theme.typography.size.xxs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 3;
  pointer-events: none;
`;


const VariantOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]};
  background: rgba(0, 0, 0, 0.86);
  z-index: 2;
  padding: ${({ theme }) => theme.space[3]};
`;

const VariantTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: center;
  margin-bottom: 2px;
`;

const VariantBtn = styled.button<{ $color: string }>`
  padding: ${({ theme }) => `${theme.space[2]} 0`};
  border-radius: ${({ theme }) => theme.radius.md};
  border: none;
  background: ${({ $color }) => $color};
  color: #fff;
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  font-family: inherit;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: filter 100ms cubic-bezier(0.22, 1, 0.36, 1), transform 80ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover { filter: brightness(1.15); }
  &:active { transform: scale(0.96); }
`;

// Condition step shown after variant is chosen
const ConditionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[2]};
`;

const ConditionBtn = styled.button<{ $color: string }>`
  padding: ${({ theme }) => `${theme.space[2]} 0`};
  border-radius: ${({ theme }) => theme.radius.md};
  border: none;
  background: ${({ $color }) => $color};
  color: #fff;
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  font-family: inherit;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: filter 100ms cubic-bezier(0.22, 1, 0.36, 1), transform 80ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover { filter: brightness(1.15); }
  &:active { transform: scale(0.96); }
`;

const BackBtn = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-family: inherit;
  cursor: pointer;
  text-align: center;
  padding: ${({ theme }) => theme.space[1]} 0 0;

  &:hover { color: rgba(255,255,255,0.8); }
`;

const QuantityOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: rgba(0, 0, 0, 0.55);
  opacity: 0;
  transition: opacity 150ms cubic-bezier(0.22, 1, 0.36, 1);

  ${TcgCardItem}:hover & {
    opacity: 1;
  }
`;

const QtyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const OwnedVariantLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: rgba(255, 255, 255, 0.95);
  font-weight: 700;
  letter-spacing: 0.04em;
`;

const AddVariantBtn = styled.button`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: #fff;
  background: rgba(180, 142, 173, 0.65);
  border: none;
  border-radius: 9999px;
  padding: 3px 8px;
  font-family: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: background 100ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    background: rgba(180, 142, 173, 0.9);
  }
`;

const QtyBtn = styled.button`
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  transition: transform 100ms cubic-bezier(0.22, 1, 0.36, 1);

  &:active { transform: scale(0.9); }
`;

const QtyMinusBtn = styled(QtyBtn)`
  background: ${({ theme }) => theme.color.aurora.red};
`;

const QtyPlusBtn = styled(QtyBtn)`
  background: ${({ theme }) => theme.color.frost.blue};
`;

const QtyCount = styled.span`
  color: #fff;
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  min-width: 1.25rem;
  text-align: center;
`;

const TcgCardImg = styled.img<{ $owned: boolean }>`
  width: 100%;
  display: block;
  opacity: ${({ $owned }) => ($owned ? 1 : 0.4)};
  transition: opacity 200ms cubic-bezier(0.22, 1, 0.36, 1);
`;

const OwnedBadge = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space[1]};
  right: ${({ theme }) => theme.space[1]};
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.frost.blue};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TcgCardName = styled.p`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
  text-align: center;
  margin: ${({ theme }) => theme.space[1]} 0;
  padding: 0 ${({ theme }) => theme.space[1]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SkeletonBox = styled(motion.div)`
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface.base};
  aspect-ratio: 3/4;
`;

// ── Card action bar (replaces EyeOverlay + AddOverlay) ───────────────────────

const CardActionsBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 5px;
  background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 150ms cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 3;

  ${TcgCardItem}:hover & {
    opacity: 1;
  }

  @media (hover: none) {
    opacity: 1;
  }
`;

const CardActionBtn = styled.button<{ $accent?: string }>`
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
  background: ${({ $accent }) => $accent ? `${$accent}cc` : 'rgba(0,0,0,0.45)'};
  backdrop-filter: blur(4px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 120ms cubic-bezier(0.22, 1, 0.36, 1), transform 100ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    background: ${({ $accent }) => $accent ? $accent : 'rgba(0,0,0,0.65)'};
    transform: scale(1.12);
  }
  &:active { transform: scale(0.9); }
`;

// ── View filter (All / Owned / Not Owned) ─────────────────────────────────────

const ViewFilter = styled.div`
  display: flex;
  background: ${({ theme }) => theme.color.surface.subtle};
  border-radius: ${({ theme }) => theme.radius.full};
  box-shadow: 0 0 0 1.5px ${({ theme }) => theme.color.surface.border};
  padding: 3px;
  margin-bottom: ${({ theme }) => theme.space[3]};
`;

const ViewFilterBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border: none;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $active, theme }) => $active ? theme.color.frost.blue : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background 150ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms cubic-bezier(0.22, 1, 0.36, 1);
`;

// ── Card preview lightbox ─────────────────────────────────────────────────────

const PreviewBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(8px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[6]};
`;

const PreviewInner = styled(motion.div)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
  max-width: 360px;
  width: 100%;
`;

const PreviewImg = styled(motion.img)`
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08);
  display: block;
`;

const PreviewInfo = styled.div`
  text-align: center;
  color: #fff;
`;

const PreviewName = styled.h3`
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  margin: 0 0 ${({ theme }) => theme.space[2]};
  text-transform: capitalize;
`;

const PreviewTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  justify-content: center;
`;

const PreviewTag = styled.span`
  padding: ${({ theme }) => `2px ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.75);
  font-size: ${({ theme }) => theme.typography.size.xs};
  text-transform: capitalize;
  border: 1px solid rgba(255,255,255,0.08);
`;

const PreviewCloseBtn = styled(motion.button)`
  position: absolute;
  top: -${({ theme }) => theme.space[3]};
  right: -${({ theme }) => theme.space[3]};
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.15);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(4px);

  &:hover { background: rgba(255,255,255,0.25); }
`;


// ── Pokemon cross-set search results ─────────────────────────────────────────

const PokemonResultsMeta = styled.p`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
  margin: 0 0 ${({ theme }) => theme.space[3]} 0;
`;

const TcgCardSetLabel = styled.p`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
  text-align: center;
  margin: ${({ theme }) => theme.space[1]} 0;
  padding: 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.space[16]} ${theme.space[4]}`};
  text-align: center;
`;

const EmptyIcon = styled.p`
  font-size: 2.5rem;
  margin: 0 0 ${({ theme }) => theme.space[3]} 0;
`;

const EmptyTitle = styled.p`
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.color.text.primary};
  margin: 0 0 ${({ theme }) => theme.space[2]} 0;
`;

const EmptyBody = styled.p`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.secondary};
  margin: 0;
`;

// ── Component ─────────────────────────────────────────────────────────────────

export function Sets() {
  const theme = useTheme();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'sets' | 'pokemon'>('sets');
  const [newestFirst, setNewestFirst] = useState(false);
  const [activeSeries, setActiveSeries] = useState('');
  const [selectedSet, setSelectedSet] = useState<TcgSet | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [cardSearch, setCardSearch] = useState('');
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [pendingVariant, setPendingVariant] = useState<'normal' | 'alternate' | 'both' | null>(null);
  const [previewCard, setPreviewCard] = useState<TcgCard | null>(null);
  const [setViewFilter, setSetViewFilter] = useState<'all' | 'owned' | 'notOwned'>('all');

  // Pokémon cross-set search
  const [pokemonResults, setPokemonResults] = useState<TcgCard[]>([]);
  const [pokemonLoading, setPokemonLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isReadOnly } = useReadOnly();
  const audRate = useAudRate();
  const { currency } = useCurrency();

  const { sets, loading: setsLoading, refresh: refreshSets } = usePokemonSetsQuery();
  const { upcoming: upcomingSets } = useUpcomingSetsQuery();
  const { cards: tcgCards, loading: cardsLoading } = usePokemonSetCardsQuery(
    selectedSet?.id ?? null
  );
  const { cards: myCards } = useGetCardsQuery();

  // Cross-set Pokémon search with debounce
  useEffect(() => {
    if (searchMode !== 'pokemon') return;
    if (!search.trim()) { setPokemonResults([]); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPokemonLoading(true);
      try {
        const res = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(search.trim())}*&orderBy=-set.releaseDate&pageSize=100`
        );
        const json = await res.json();
        setPokemonResults(json.data ?? []);
      } catch {
        setPokemonResults([]);
      } finally {
        setPokemonLoading(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, searchMode]);

  // Dismiss pending picker on Escape
  useEffect(() => {
    if (!pendingCard) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPendingCard(null); setPendingVariant(null); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pendingCard]);

  // Owned detection — only cards with status === 'owned' (default) count as owned.
  // Wishlist (wanted) cards are tracked separately via `wantedTcgIds` so they
  // don't accidentally render as owned in the set grid.
  const ownedCards = useMemo(
    () => myCards.filter((c) => (c.status ?? 'owned') !== 'wishlist'),
    [myCards],
  );
  const wantedCards = useMemo(
    () => myCards.filter((c) => c.status === 'wishlist'),
    [myCards],
  );

  const ownedTcgIds = useMemo(
    () => new Set(ownedCards.map((c) => c.attributes.tcgId).filter(Boolean)),
    [ownedCards]
  );
  const ownedByNameAndSet = useMemo(() => {
    if (!selectedSet) return new Set<string>();
    return new Set(
      ownedCards
        .filter(
          (c) =>
            !c.attributes.tcgId &&
            c.attributes.set.toLowerCase() === selectedSet.name.toLowerCase()
        )
        .map((c) => c.pokemonData.name.toLowerCase())
    );
  }, [ownedCards, selectedSet]);

  const wantedTcgIds = useMemo(
    () => new Set(wantedCards.map((c) => c.attributes.tcgId).filter(Boolean)),
    [wantedCards]
  );

  const isOwned = (card: TcgCard) =>
    ownedTcgIds.has(card.id) || ownedByNameAndSet.has(card.name.toLowerCase());

  const isOnWishlist = (card: TcgCard) => wantedTcgIds.has(card.id);

  // O(1) lookup map for owned-card-by-tcg-id. Was a linear scan before — for
  // a 250-card set with 500+ owned cards in the user's collection that was
  // O(n²) per render. Memoized on myCards/selectedSet so it's stable across
  // re-renders of individual card items.
  const cardByTcgId = useMemo(() => {
    const map = new Map<string, CardModel>();
    for (const c of myCards) {
      if (c.attributes.tcgId) map.set(c.attributes.tcgId, c);
    }
    return map;
  }, [myCards]);

  const cardByNameInSet = useMemo(() => {
    if (!selectedSet) return new Map<string, CardModel>();
    const map = new Map<string, CardModel>();
    const setName = selectedSet.name.toLowerCase();
    for (const c of myCards) {
      if (c.attributes.tcgId) continue;
      if (c.attributes.set.toLowerCase() !== setName) continue;
      map.set(c.pokemonData.name.toLowerCase(), c);
    }
    return map;
  }, [myCards, selectedSet]);

  const findOwnedCard = useCallback(
    (card: TcgCard): CardModel | undefined => {
      return cardByTcgId.get(card.id) ?? cardByNameInSet.get(card.name.toLowerCase());
    },
    [cardByTcgId, cardByNameInSet],
  );

  const handleWishlistToggle = useCallback(async (card: TcgCard) => {
    if (isReadOnly) return;
    const existing = findOwnedCard(card);
    // Already on wishlist — remove it with undo
    if (existing && existing.status === 'wishlist') {
      const snapshot = existing;
      await removeCard(existing.cardId);
      toast({
        message: `${card.name} removed from wishlist`,
        tone: 'info',
        undo: async () => {
          await saveCard(snapshot);
        },
      });
      return;
    }
    // Already owned — don't overwrite; bail out
    if (existing && existing.status !== 'wishlist') {
      toast({
        message: `${card.name} is already in your collection`,
        tone: 'warning',
      });
      return;
    }
    // Create a new card as wanted
    const setName = selectedSet?.name ?? card.set.name;
    const wanted: CardModel = {
      cardId: generateCardId(),
      status: 'wishlist',
      quantity: 1,
      setNumber: card.number ? parseInt(card.number, 10) || 0 : 0,
      attributes: {
        cardType: '',
        set: setName,
        rarity: card.rarity ?? '',
        condition: '',
        grading: 0,
        isGraded: false,
        tcgId: card.id,
        tcgImageUrl: card.images.large,
        variants: { normal: true, alternate: false },
      },
      pokemonData: {
        name: card.name,
        id: 0,
        evolutions: { first: { name: '', imageUrl: '' } },
        type: (card.types?.[0] === 'Lightning' ? 'Electric' : card.types?.[0]) ?? '',
        imageUrl: `https://img.pokemondb.net/sprites/home/normal/${toSpriteName(card.name)}.png`,
      },
    };
    await saveCard(wanted);
    toast({ message: `${card.name} added to wishlist`, tone: 'success' });
  }, [selectedSet, isReadOnly, myCards, findOwnedCard, toast]);

  const handleQuickAdd = useCallback(async (
    card: TcgCard,
    variant: 'normal' | 'alternate' | 'both' = 'normal',
    condition = '',
    isGraded = false,
  ) => {
    if (isReadOnly) return;
    const setName = selectedSet?.name ?? card.set.name;
    const prices = card.tcgplayer?.prices;
    const marketPrice = isGraded ? undefined : (
      prices?.normal?.market ??
      prices?.holofoil?.market ??
      prices?.reverseHolofoil?.market ??
      undefined
    );

    // Promotion path: if this card already exists as a wishlist entry, flip it
    // to owned in-place (preserving its cardId + createdAt) rather than creating
    // a duplicate row. This is the common "I wanted it, now I got it" flow.
    const existingWanted = myCards.find(
      (c) => c.attributes.tcgId === card.id && c.status === 'wishlist',
    );
    if (existingWanted) {
      await saveCard({
        ...existingWanted,
        status: 'owned',
        quantity: variant === 'both' ? 2 : 1,
        setNumber: card.number ? parseInt(card.number, 10) || 0 : existingWanted.setNumber,
        attributes: {
          ...existingWanted.attributes,
          condition,
          grading: 0,
          isGraded,
          ...(marketPrice != null ? { marketPrice } : {}),
          variants: {
            normal: variant !== 'alternate',
            alternate: variant !== 'normal',
          },
        },
      });
      setJustAddedId(card.id);
      toast({
        message: `${card.name} — moved from wishlist to collection`,
        tone: 'success',
      });
      setTimeout(() => setJustAddedId(null), 700);
      return;
    }

    const cardModel: CardModel = {
      cardId: generateCardId(),
      status: 'owned',
      // "Both" = two physical cards: the standard print + the alternate print
      quantity: variant === 'both' ? 2 : 1,
      setNumber: card.number ? parseInt(card.number, 10) || 0 : 0,
      attributes: {
        cardType: '',
        set: setName,
        rarity: card.rarity ?? '',
        condition,
        grading: 0,
        isGraded,
        tcgId: card.id,
        tcgImageUrl: card.images.large,
        ...(marketPrice != null ? { marketPrice } : {}),
        variants: {
          normal: variant !== 'alternate',
          alternate: variant !== 'normal',
        },
      },
      pokemonData: {
        name: card.name,
        id: 0,
        evolutions: { first: { name: '', imageUrl: '' } },
        type: (card.types?.[0] === 'Lightning' ? 'Electric' : card.types?.[0]) ?? '',
        imageUrl: `https://img.pokemondb.net/sprites/home/normal/${toSpriteName(card.name)}.png`,
      },
    };
    setJustAddedId(card.id);
    await saveCard(cardModel);
    toast({ message: `${card.name} added to your collection`, tone: 'success' });
    setTimeout(() => setJustAddedId(null), 700);
  }, [selectedSet, isReadOnly, myCards, toast]);

  const getVariantState = (card: CardModel): 'normal' | 'alternate' | 'both' => {
    const v = card.attributes.variants;
    if (!v) return 'normal';
    const hasAlternate = v.alternate ?? v.reverseHolo ?? false;
    if (v.normal && hasAlternate) return 'both';
    if (hasAlternate) return 'alternate';
    return 'normal';
  };

  const handleAddVariant = useCallback(async (card: TcgCard) => {
    if (isReadOnly) return;
    const owned = findOwnedCard(card);
    if (!owned) return;
    await saveCard({
      ...owned,
      quantity: Math.max(owned.quantity ?? 1, 2),
      attributes: { ...owned.attributes, variants: { normal: true, alternate: true } },
    });
    toast({ message: `${card.name} — both variants noted`, tone: 'success' });
  }, [isReadOnly, findOwnedCard, toast]);

  const handleUpdateQuantity = useCallback(async (card: TcgCard, delta: number) => {
    if (isReadOnly) return;
    const owned = findOwnedCard(card);
    if (!owned) return;
    const newQty = (owned.quantity ?? 1) + delta;
    if (newQty <= 0) {
      const snapshot = owned;
      await removeCard(owned.cardId);
      toast({
        message: `${card.name} removed from your collection`,
        tone: 'info',
        undo: async () => { await saveCard(snapshot); },
      });
    } else {
      await saveCard({ ...owned, quantity: newQty });
    }
  }, [isReadOnly, findOwnedCard, toast]);

  const series = useMemo(
    () => ['', ...new Set(sets.map((s) => s.series))],
    [sets]
  );

  const filteredSets = useMemo(() => {
    const filtered = sets.filter((s) => {
      if (activeSeries && s.series !== activeSeries) return false;
      if (searchMode === 'sets' && search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return newestFirst ? [...filtered].reverse() : filtered;
  }, [sets, search, activeSeries, searchMode, newestFirst]);

  const getCompletionPct = (set: TcgSet) => {
    const count = myCards.filter(
      (c) =>
        c.attributes.set.toLowerCase() === set.name.toLowerCase() &&
        (c.status ?? 'owned') !== 'wishlist'
    ).length;
    if (count === 0) return 0;
    return Math.min(100, Math.round((count / set.total) * 100));
  };

  // Aggregate stats for the mobile hero summary card
  const setsSummary = useMemo(() => {
    if (!sets.length) return { total: 0, started: 0, complete: 0, pct: 0 };
    let started = 0;
    let complete = 0;
    let owned = 0;
    let possible = 0;
    for (const s of sets) {
      const count = myCards.filter(
        (c) => c.attributes.set.toLowerCase() === s.name.toLowerCase() && (c.status ?? 'owned') !== 'wishlist',
      ).length;
      possible += s.total;
      if (count > 0) {
        started++;
        owned += count;
        if (count >= s.total) complete++;
      }
    }
    const pct = possible > 0 ? Math.round((owned / possible) * 100) : 0;
    return { total: sets.length, started, complete, pct };
  }, [sets, myCards]);

  // Prices for owned cards in selected set only
  const ownedSetTcgIds = useMemo(
    () => (selectedSet
      ? myCards
          .filter((c) => c.attributes.tcgId &&
            c.attributes.set.toLowerCase() === selectedSet.name.toLowerCase())
          .map((c) => c.attributes.tcgId!)
      : []
    ),
    [myCards, selectedSet]
  );
  const { priceMap: setPriceMap } = useTcgPrices(ownedSetTcgIds);

  const setOwnedValue = useMemo(() => {
    if (!selectedSet || !setPriceMap.size) return null;
    let total = 0;
    let count = 0;
    for (const card of myCards) {
      if (!card.attributes.tcgId) continue;
      if (card.attributes.set.toLowerCase() !== selectedSet.name.toLowerCase()) continue;
      const price = setPriceMap.get(card.attributes.tcgId);
      if (price != null) {
        total += price * Math.max(1, Number(card.quantity) || 1);
        count++;
      }
    }
    return count > 0 ? total : null;
  }, [myCards, selectedSet, setPriceMap]);

  const filteredTcgCards = useMemo(() => {
    let base = cardSearch.trim()
      ? tcgCards.filter((c) => c.name.toLowerCase().includes(cardSearch.toLowerCase()))
      : tcgCards;
    if (setViewFilter === 'owned') base = base.filter(isOwned);
    if (setViewFilter === 'notOwned') base = base.filter((c) => !isOwned(c));
    return base;
  }, [tcgCards, cardSearch, setViewFilter, ownedTcgIds, ownedByNameAndSet]);

  // Window the large card grids so opening a 250-card set mounts ~60 nodes at a
  // time instead of all at once. Counts/empty-states still use the full arrays.
  // resetKey keys the window to the filter context (not the array identity) so
  // background-paginated cards appending don't reset the user's scroll window.
  const revealSetCards = useIncrementalReveal(
    filteredTcgCards,
    60,
    `${selectedSet?.id ?? ''}|${cardSearch}|${setViewFilter}`,
  );
  const revealResults = useIncrementalReveal(pokemonResults, 60, search);

  if (selectedSet) {
    const ownedInSet = tcgCards.filter(isOwned);

    return (
      <>
        <Main>
          <section>
            <SectionWrapper>
              <DetailBackBtn
                onClick={() => { setSelectedSet(null); setCardSearch(''); setSetViewFilter('all'); setPreviewCard(null); }}
                aria-label='Back to all sets'
              >
                <IconChevronLeft size={14} stroke={2.5} />
                All Sets
              </DetailBackBtn>

              <HeroCard accent='blue'>
                <DetailHeroLogoRow>
                  {selectedSet.images?.logo && (
                    <DetailHeroLogoBubble>
                      <DetailHeroLogoImg src={selectedSet.images.logo} alt={selectedSet.name} />
                    </DetailHeroLogoBubble>
                  )}
                  <DetailHeroNameBlock>
                    <DetailHeroName>{selectedSet.name}</DetailHeroName>
                    <DetailHeroSubtitle>
                      {selectedSet.series} · {selectedSet.releaseDate}
                    </DetailHeroSubtitle>
                  </DetailHeroNameBlock>
                </DetailHeroLogoRow>
                <HeroStatsRow>
                  <HeroStat>
                    <HeroStatValue>{ownedInSet.length}</HeroStatValue>
                    <HeroStatLabel>Owned</HeroStatLabel>
                  </HeroStat>
                  <HeroStat>
                    <HeroStatValue>{selectedSet.total}</HeroStatValue>
                    <HeroStatLabel>Total</HeroStatLabel>
                  </HeroStat>
                  <HeroStat style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                    <HeroStatValue>
                      {Math.min(100, Math.round((ownedInSet.length / Math.max(1, selectedSet.total)) * 100))}%
                    </HeroStatValue>
                    <HeroStatLabel>Complete</HeroStatLabel>
                  </HeroStat>
                </HeroStatsRow>
                <HeroProgressBar>
                  <HeroProgressFill
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, Math.round((ownedInSet.length / Math.max(1, selectedSet.total)) * 100))}%`,
                    }}
                    transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.2 }}
                  />
                </HeroProgressBar>
                {ownedInSet.length > 0 && setOwnedValue != null && (
                  <DetailHeroSubtitle style={{ position: 'relative', zIndex: 1 }}>
                    Est. value · {fmtPrice(setOwnedValue, currency, audRate)}
                  </DetailHeroSubtitle>
                )}
              </HeroCard>

              <SearchWrapper>
                <SearchIcon><IconSearch size={16} stroke={2} /></SearchIcon>
                <SearchInput
                  placeholder='Search cards in this set...'
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                />
                <AnimatePresence>
                  {cardSearch && (
                    <ClearBtn
                      key='card-clear'
                      className='icon-close'
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      onClick={() => setCardSearch('')}
                    >
                      <IconX size={12} stroke={2.5} />
                    </ClearBtn>
                  )}
                </AnimatePresence>
              </SearchWrapper>

              <ViewFilter>
                <ViewFilterBtn $active={setViewFilter === 'all'} onClick={() => setSetViewFilter('all')}>All</ViewFilterBtn>
                <ViewFilterBtn $active={setViewFilter === 'owned'} onClick={() => setSetViewFilter('owned')}>Owned</ViewFilterBtn>
                <ViewFilterBtn $active={setViewFilter === 'notOwned'} onClick={() => setSetViewFilter('notOwned')}>Not Owned</ViewFilterBtn>
              </ViewFilter>

              <AnimatePresence>
                {cardsLoading ? (
                  <CardsGrid key='skeleton'>
                    {Array.from({ length: 20 }).map((_, i) => (
                      <SkeletonBox
                        key={i}
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                      />
                    ))}
                  </CardsGrid>
                ) : filteredTcgCards.length === 0 && setViewFilter === 'owned' ? (
                  <EmptyState
                    key='no-owned'
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EmptyIcon>📦</EmptyIcon>
                    <EmptyTitle>No cards owned from this set</EmptyTitle>
                    <EmptyBody>Add cards using the All tab to track your collection.</EmptyBody>
                  </EmptyState>
                ) : filteredTcgCards.length === 0 && cardSearch ? (
                  <EmptyState
                    key='no-results'
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EmptyIcon>🔍</EmptyIcon>
                    <EmptyTitle>No results for "{cardSearch}"</EmptyTitle>
                    <EmptyBody>No Pokémon with that name in {selectedSet.name}.</EmptyBody>
                  </EmptyState>
                ) : (
                  <motion.div
                    key='set-cards'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardsGrid>
                      {revealSetCards.visible.map((card, i) => {
                        const owned = isOwned(card);
                        const wanted = isOnWishlist(card);
                        return (
                          <TcgCardItem
                            key={card.id}
                            $owned={owned}
                            $wanted={wanted}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.4) }}
                            whileHover={hoverLiftLg}
                            whileTap={tapPress}
                            style={{ cursor: 'default' }}
                          >
                            <TcgCardImg
                              src={card.images.small}
                              alt={card.name}
                              $owned={owned || wanted}
                              loading='lazy'
                            />
                            {wanted && !owned && (
                              <WishlistRibbon>
                                <IconHeartFilled size={10} /> Wishlist
                              </WishlistRibbon>
                            )}
                            {owned && (() => {
                              const ownedCard = findOwnedCard(card);
                              const vState = ownedCard ? getVariantState(ownedCard) : 'normal';
                              const vLabel = vState === 'both' ? 'Normal + Alt' : vState === 'alternate' ? 'Alternate' : 'Normal';
                              return (
                                <>
                                  <OwnedBadge>
                                    <svg width='8' height='8' viewBox='0 0 10 8' fill='none'>
                                      <path d='M1 4L3.5 6.5L9 1' stroke='white' strokeWidth='1.8' strokeLinecap='round' />
                                    </svg>
                                  </OwnedBadge>
                                  <QuantityOverlay>
                                    <OwnedVariantLabel>{vLabel}</OwnedVariantLabel>
                                    <QtyRow>
                                      <QtyMinusBtn
                                        onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, -1); }}
                                        title='Remove one'
                                      >−</QtyMinusBtn>
                                      <QtyCount>{ownedCard?.quantity ?? 1}</QtyCount>
                                      <QtyPlusBtn
                                        onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, 1); }}
                                        title='Add one more'
                                      >+</QtyPlusBtn>
                                    </QtyRow>
                                    {vState !== 'both' && !isReadOnly && (
                                      <AddVariantBtn
                                        onClick={(e) => { e.stopPropagation(); handleAddVariant(card); }}
                                      >
                                        + {vState === 'normal' ? 'Alternate' : 'Normal'}
                                      </AddVariantBtn>
                                    )}
                                  </QuantityOverlay>
                                </>
                              );
                            })()}
                            {!owned && pendingCard === card.id && !isReadOnly && (
                              <VariantOverlay>
                                {pendingVariant === null ? (
                                  <>
                                    <VariantTitle>Print</VariantTitle>
                                    <VariantBtn $color='#81a1c1' onClick={(e) => { e.stopPropagation(); setPendingVariant('normal'); }}>Normal</VariantBtn>
                                    <VariantBtn $color='#b48ead' onClick={(e) => { e.stopPropagation(); setPendingVariant('alternate'); }}>Alternate</VariantBtn>
                                    <VariantBtn $color='#a3be8c' onClick={(e) => { e.stopPropagation(); setPendingVariant('both'); }}>Both</VariantBtn>
                                    <BackBtn onClick={(e) => { e.stopPropagation(); setPendingCard(null); setPendingVariant(null); }}>✕ cancel</BackBtn>
                                  </>
                                ) : (
                                  <>
                                    <VariantTitle>Condition</VariantTitle>
                                    <ConditionGrid>
                                      <ConditionBtn $color='#a3be8c' onClick={(e) => { e.stopPropagation(); handleQuickAdd(card, pendingVariant, 'Near Mint', false); setPendingCard(null); setPendingVariant(null); }}>NM</ConditionBtn>
                                      <ConditionBtn $color='#81a1c1' onClick={(e) => { e.stopPropagation(); handleQuickAdd(card, pendingVariant, 'Lightly Played', false); setPendingCard(null); setPendingVariant(null); }}>LP</ConditionBtn>
                                      <ConditionBtn $color='#ebcb8b' onClick={(e) => { e.stopPropagation(); handleQuickAdd(card, pendingVariant, 'Moderately Played', false); setPendingCard(null); setPendingVariant(null); }}>MP</ConditionBtn>
                                      <ConditionBtn $color='#d08770' onClick={(e) => { e.stopPropagation(); handleQuickAdd(card, pendingVariant, 'Heavily Played', false); setPendingCard(null); setPendingVariant(null); }}>HP</ConditionBtn>
                                      <ConditionBtn $color='#b48ead' onClick={(e) => { e.stopPropagation(); handleQuickAdd(card, pendingVariant, '', true); setPendingCard(null); setPendingVariant(null); }} style={{ gridColumn: '1 / -1' }}>Graded</ConditionBtn>
                                    </ConditionGrid>
                                    <BackBtn onClick={(e) => { e.stopPropagation(); setPendingVariant(null); }}>← back</BackBtn>
                                  </>
                                )}
                              </VariantOverlay>
                            )}
                            {justAddedId === card.id && (
                              <motion.div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  borderRadius: 'inherit',
                                  border: `3px solid ${theme.color.aurora.green}`,
                                  pointerEvents: 'none',
                                }}
                                initial={{ scale: 1, opacity: 1 }}
                                animate={{ scale: 1.18, opacity: 0 }}
                                transition={{ duration: 0.65, ease: easeOut }}
                              />
                            )}
                            {/* Bottom action bar: eye (preview) + plus (add) + heart (wishlist) */}
                            <CardActionsBar>
                              <CardActionBtn
                                title='Preview card'
                                onClick={(e) => { e.stopPropagation(); setPreviewCard(card); }}
                              >
                                <IconEye size={12} stroke={2} />
                              </CardActionBtn>
                              <div style={{ display: 'flex', gap: 5 }}>
                                {!isReadOnly && (
                                  <CardActionBtn
                                    $accent={isOnWishlist(card) ? theme.color.aurora.red : undefined}
                                    title={isOnWishlist(card) ? 'Remove from wishlist' : 'Add to wishlist'}
                                    onClick={(e) => { e.stopPropagation(); handleWishlistToggle(card); }}
                                  >
                                    {isOnWishlist(card)
                                      ? <IconHeartFilled size={12} />
                                      : <IconHeart size={12} stroke={2} />}
                                  </CardActionBtn>
                                )}
                                {!owned && !isReadOnly && (
                                  <CardActionBtn
                                    $accent={theme.color.frost.blue}
                                    title='Add to collection'
                                    onClick={(e) => { e.stopPropagation(); const next = pendingCard === card.id ? null : card.id; setPendingCard(next); if (!next) setPendingVariant(null); }}
                                  >
                                    <IconPlus size={12} stroke={2.5} />
                                  </CardActionBtn>
                                )}
                              </div>
                            </CardActionsBar>
                            <TcgCardName>{card.name}</TcgCardName>
                          </TcgCardItem>
                        );
                      })}
                    </CardsGrid>
                    {revealSetCards.hasMore && (
                      <div ref={revealSetCards.sentinelRef} aria-hidden style={{ height: 1 }} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </SectionWrapper>
          </section>
        </Main>
        {/* Card preview lightbox */}
        <AnimatePresence>
          {previewCard && (
            <PreviewBackdrop
              key='preview'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setPreviewCard(null)}
            >
              <PreviewInner
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              >
                <PreviewCloseBtn
                  className='icon-close'
                  onClick={() => setPreviewCard(null)}
                  whileTap={tapPressFirm}
                  aria-label='Close preview'
                >
                  <IconX size={14} stroke={2.5} />
                </PreviewCloseBtn>
                <PreviewImg
                  src={previewCard.images.large}
                  alt={previewCard.name}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.05, duration: 0.2 }}
                />
                <PreviewInfo>
                  <PreviewName>{previewCard.name}</PreviewName>
                  <PreviewTags>
                    {previewCard.set.name && <PreviewTag>{previewCard.set.name}</PreviewTag>}
                    {previewCard.rarity && <PreviewTag>{previewCard.rarity}</PreviewTag>}
                    {previewCard.number && <PreviewTag>#{previewCard.number}</PreviewTag>}
                    {previewCard.tcgplayer?.prices && (() => {
                      const p = previewCard.tcgplayer!.prices!;
                      const price = p.normal?.market ?? p.holofoil?.market ?? p.reverseHolofoil?.market;
                      return price ? <PreviewTag style={{ color: '#a3be8c' }}>A${(price * audRate).toFixed(2)}</PreviewTag> : null;
                    })()}
                  </PreviewTags>
                </PreviewInfo>
              </PreviewInner>
            </PreviewBackdrop>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <Main>
      <section>
        <SectionWrapper>
          <PageHeader style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <PageTitle>Card Sets</PageTitle>
              <PageSubtitle>Browse all Pokémon TCG sets and track your collection progress.</PageSubtitle>
            </div>
            <SyncBtn
              $loading={setsLoading}
              onClick={refreshSets}
              disabled={setsLoading}
              title='Check for new sets'
            >
              <IconRefresh size={14} stroke={2} />
              Sync
            </SyncBtn>
            <SyncIconBtn
              $loading={setsLoading}
              onClick={refreshSets}
              disabled={setsLoading}
              whileTap={tapPressFirm}
              aria-label='Sync sets'
              title='Check for new sets'
            >
              <IconRefresh size={14} stroke={2} />
            </SyncIconBtn>
          </PageHeader>

          {!setsLoading && setsSummary.total > 0 && (
            <HeroCard accent='purple'>
              <HeroStatsRow>
                <HeroStat>
                  <HeroStatValue>{setsSummary.started}</HeroStatValue>
                  <HeroStatLabel>Started</HeroStatLabel>
                </HeroStat>
                <HeroStat>
                  <HeroStatValue>{setsSummary.complete}</HeroStatValue>
                  <HeroStatLabel>Complete</HeroStatLabel>
                </HeroStat>
                <HeroStat style={{ marginLeft: 'auto' }}>
                  <HeroStatValue>{setsSummary.pct}%</HeroStatValue>
                  <HeroStatLabel>Collected</HeroStatLabel>
                </HeroStat>
              </HeroStatsRow>
              <HeroProgressBar>
                <HeroProgressFill
                  initial={{ width: 0 }}
                  animate={{ width: `${setsSummary.pct}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.2 }}
                />
              </HeroProgressBar>
            </HeroCard>
          )}

          <SearchRow>
            <SearchWrapper style={{ margin: 0, flex: 1 }}>
              <SearchIcon><IconSearch size={16} stroke={2} /></SearchIcon>
              <SearchInput
                placeholder={searchMode === 'sets' ? 'Search sets...' : 'Search Pokémon across all sets...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <AnimatePresence>
                {search && (
                  <ClearBtn
                    key='clear'
                    className='icon-close'
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    onClick={() => setSearch('')}
                  >
                    <IconX size={12} stroke={2.5} />
                  </ClearBtn>
                )}
              </AnimatePresence>
            </SearchWrapper>
            <ModeToggle>
              <ModeBtn $active={searchMode === 'sets'} onClick={() => { setSearchMode('sets'); setSearch(''); }}>
                Sets
              </ModeBtn>
              <ModeBtn $active={searchMode === 'pokemon'} onClick={() => { setSearchMode('pokemon'); setSearch(''); }}>
                Pokémon
              </ModeBtn>
            </ModeToggle>
            {searchMode === 'sets' && (
              <SortBtn
                onClick={() => setNewestFirst((p) => !p)}
                title={newestFirst ? 'Showing newest first - click for oldest first' : 'Showing oldest first - click for newest first'}
              >
                {newestFirst ? <IconSortDescending size={16} stroke={2} /> : <IconSortAscending size={16} stroke={2} />}
              </SortBtn>
            )}
          </SearchRow>

          {searchMode === 'sets' && (
            <PillRow>
              {series.map((s) => (
                <Pill
                  key={s || 'all'}
                  $active={activeSeries === s}
                  onClick={() => setActiveSeries(s)}
                  whileTap={tapPressFirm}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  {s || 'All'}
                </Pill>
              ))}
            </PillRow>
          )}

          {searchMode === 'pokemon' ? (
            <AnimatePresence>
              {!search.trim() ? (
                <EmptyState key='idle' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <EmptyIcon>🔍</EmptyIcon>
                  <EmptyTitle>Search for a Pokémon</EmptyTitle>
                  <EmptyBody>Type a name to find cards across every set.</EmptyBody>
                </EmptyState>
              ) : pokemonLoading ? (
                <CardsGrid key='loading'>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <SkeletonBox key={i} animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }} />
                  ))}
                </CardsGrid>
              ) : pokemonResults.length === 0 ? (
                <EmptyState key='no-results' initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <EmptyIcon>🔍</EmptyIcon>
                  <EmptyTitle>No results for "{search}"</EmptyTitle>
                  <EmptyBody>Try a different Pokémon name.</EmptyBody>
                </EmptyState>
              ) : (
                <motion.div key='results' initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                  <PokemonResultsMeta>{pokemonResults.length} card{pokemonResults.length !== 1 ? 's' : ''} found across all sets</PokemonResultsMeta>
                  <CardsGrid>
                    {revealResults.visible.map((card, i) => {
                      const owned = isOwned(card);
                      const wanted = isOnWishlist(card);
                      return (
                        <TcgCardItem
                          key={card.id}
                          $owned={owned}
                          $wanted={wanted}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.4) }}
                          whileHover={hoverLiftLg}
                          whileTap={tapPress}
                          style={{ cursor: 'default' }}
                        >
                          <TcgCardImg src={card.images.small} alt={card.name} $owned={owned || wanted} loading='lazy' />
                          {wanted && !owned && (
                            <WishlistRibbon>
                              <IconHeartFilled size={10} /> Wishlist
                            </WishlistRibbon>
                          )}
                          {owned && (() => {
                            const ownedCard = findOwnedCard(card);
                            const vState = ownedCard ? getVariantState(ownedCard) : 'normal';
                            const vLabel = vState === 'both' ? 'Normal + Alt' : vState === 'alternate' ? 'Alternate' : 'Normal';
                            return (
                              <>
                                <OwnedBadge>
                                  <svg width='8' height='8' viewBox='0 0 10 8' fill='none'>
                                    <path d='M1 4L3.5 6.5L9 1' stroke='white' strokeWidth='1.8' strokeLinecap='round' />
                                  </svg>
                                </OwnedBadge>
                                <QuantityOverlay>
                                  <OwnedVariantLabel>{vLabel}</OwnedVariantLabel>
                                  <QtyRow>
                                    <QtyMinusBtn onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, -1); }} title='Remove one'>−</QtyMinusBtn>
                                    <QtyCount>{ownedCard?.quantity ?? 1}</QtyCount>
                                    <QtyPlusBtn onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, 1); }} title='Add one more'>+</QtyPlusBtn>
                                  </QtyRow>
                                  {vState !== 'both' && !isReadOnly && (
                                    <AddVariantBtn onClick={(e) => { e.stopPropagation(); handleAddVariant(card); }}>
                                      + {vState === 'normal' ? 'Alternate' : 'Normal'}
                                    </AddVariantBtn>
                                  )}
                                </QuantityOverlay>
                              </>
                            );
                          })()}
                          {!owned && pendingCard === card.id && !isReadOnly && (
                            <VariantOverlay>
                              {pendingVariant === null ? (
                                <>
                                  <VariantTitle>Print</VariantTitle>
                                  <VariantBtn $color='#81a1c1' onClick={(e) => { e.stopPropagation(); setPendingVariant('normal'); }}>Normal</VariantBtn>
                                  <VariantBtn $color='#b48ead' onClick={(e) => { e.stopPropagation(); setPendingVariant('alternate'); }}>Alternate</VariantBtn>
                                  <VariantBtn $color='#a3be8c' onClick={(e) => { e.stopPropagation(); setPendingVariant('both'); }}>Both</VariantBtn>
                                  <BackBtn onClick={(e) => { e.stopPropagation(); setPendingCard(null); setPendingVariant(null); }}>✕ cancel</BackBtn>
                                </>
                              ) : (
                                <>
                                  <VariantTitle>Condition</VariantTitle>
                                  <ConditionGrid>
                                    <ConditionBtn $color='#a3be8c' onClick={(e) => { e.stopPropagation(); handleQuickAdd(card, pendingVariant, 'Near Mint', false); setPendingCard(null); setPendingVariant(null); }}>NM</ConditionBtn>
                                    <ConditionBtn $color='#81a1c1' onClick={(e) => { e.stopPropagation(); handleQuickAdd(card, pendingVariant, 'Lightly Played', false); setPendingCard(null); setPendingVariant(null); }}>LP</ConditionBtn>
                                    <ConditionBtn $color='#ebcb8b' onClick={(e) => { e.stopPropagation(); handleQuickAdd(card, pendingVariant, 'Moderately Played', false); setPendingCard(null); setPendingVariant(null); }}>MP</ConditionBtn>
                                    <ConditionBtn $color='#d08770' onClick={(e) => { e.stopPropagation(); handleQuickAdd(card, pendingVariant, 'Heavily Played', false); setPendingCard(null); setPendingVariant(null); }}>HP</ConditionBtn>
                                    <ConditionBtn $color='#b48ead' onClick={(e) => { e.stopPropagation(); handleQuickAdd(card, pendingVariant, '', true); setPendingCard(null); setPendingVariant(null); }} style={{ gridColumn: '1 / -1' }}>Graded</ConditionBtn>
                                  </ConditionGrid>
                                  <BackBtn onClick={(e) => { e.stopPropagation(); setPendingVariant(null); }}>← back</BackBtn>
                                </>
                              )}
                            </VariantOverlay>
                          )}
                          {justAddedId === card.id && (
                            <motion.div
                              style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', border: `3px solid ${theme.color.aurora.green}`, pointerEvents: 'none' }}
                              initial={{ scale: 1, opacity: 1 }}
                              animate={{ scale: 1.18, opacity: 0 }}
                              transition={{ duration: 0.65, ease: easeOut }}
                            />
                          )}
                          {/* Bottom action bar */}
                          <CardActionsBar>
                            <CardActionBtn
                              title='Preview card'
                              onClick={(e) => { e.stopPropagation(); setPreviewCard(card); }}
                            >
                              <IconEye size={12} stroke={2} />
                            </CardActionBtn>
                            <div style={{ display: 'flex', gap: 5 }}>
                              {!isReadOnly && (
                                <CardActionBtn
                                  $accent={isOnWishlist(card) ? theme.color.aurora.red : undefined}
                                  title={isOnWishlist(card) ? 'Remove from wishlist' : 'Add to wishlist'}
                                  onClick={(e) => { e.stopPropagation(); handleWishlistToggle(card); }}
                                >
                                  {isOnWishlist(card)
                                    ? <IconHeartFilled size={12} />
                                    : <IconHeart size={12} stroke={2} />}
                                </CardActionBtn>
                              )}
                              {!owned && !isReadOnly && (
                                <CardActionBtn
                                  $accent={theme.color.frost.blue}
                                  title='Add to collection'
                                  onClick={(e) => { e.stopPropagation(); const next = pendingCard === card.id ? null : card.id; setPendingCard(next); if (!next) setPendingVariant(null); }}
                                >
                                  <IconPlus size={12} stroke={2.5} />
                                </CardActionBtn>
                              )}
                            </div>
                          </CardActionsBar>
                          <TcgCardSetLabel>{card.set?.name ?? ''}</TcgCardSetLabel>
                        </TcgCardItem>
                      );
                    })}
                  </CardsGrid>
                  {revealResults.hasMore && (
                    <div ref={revealResults.sentinelRef} aria-hidden style={{ height: 1 }} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          ) : setsLoading ? (
            <SetsGrid>
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonBox
                  key={i}
                  style={{ height: '9.5rem', aspectRatio: 'auto' }}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.08 }}
                />
              ))}
            </SetsGrid>
          ) : (
            <>
              {searchMode === 'sets' && !search.trim() && !activeSeries && upcomingSets.length > 0 && (
                <UpcomingSection>
                  <UpcomingHeader>
                    <UpcomingTitle>
                      <PulseDot
                        animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: easeInOut }}
                      />
                      Coming soon
                    </UpcomingTitle>
                  </UpcomingHeader>
                  <UpcomingStrip>
                    {upcomingSets.map((set, i) => (
                      <UpcomingCard
                        key={set.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.04 }}
                      >
                        <UpcomingCardHeader>
                          <UpcomingName title={set.name}>{set.name}</UpcomingName>
                          <UpcomingBadge $rumored={!!set.isRumored}>
                            {set.isRumored ? 'Rumored' : 'Coming'}
                          </UpcomingBadge>
                        </UpcomingCardHeader>
                        <UpcomingSeries>{set.series}</UpcomingSeries>
                        <UpcomingDate>
                          {set.releaseDate ? formatUpcomingDate(set.releaseDate) : 'TBA'}
                          {set.isRumored && set.rumoredSource ? ` · ${set.rumoredSource}` : ''}
                        </UpcomingDate>
                      </UpcomingCard>
                    ))}
                  </UpcomingStrip>
                </UpcomingSection>
              )}
              <SetsGrid>
              {filteredSets.map((set, i) => {
                const pct = getCompletionPct(set);
                return (
                  <SetCard
                    key={set.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.5) }}
                    whileTap={tapPressSoft}
                    onClick={() => setSelectedSet(set)}
                  >
                    <LogoRing pct={pct}>
                      {set.images?.logo ? (
                        <SetLogo src={set.images.logo} alt={set.name} loading='lazy' />
                      ) : (
                        <SetLogoFallback>
                          <IconPackage size={28} stroke={1} />
                        </SetLogoFallback>
                      )}
                    </LogoRing>
                    <SetInfo>
                      <SetName>{set.name}</SetName>
                      <SetMeta>{set.series} · {set.releaseDate}</SetMeta>
                    </SetInfo>
                    <SetFooter>
                      <CardCount>{set.total} cards</CardCount>
                      <CollectionBadge $pct={pct}>
                        {pct === 0 ? 'Not started' : pct === 100 ? 'Complete' : `${pct}%`}
                      </CollectionBadge>
                    </SetFooter>
                  </SetCard>
                );
              })}
              </SetsGrid>
            </>
          )}
        </SectionWrapper>
      </section>
    </Main>
  );
}
