import styled from 'styled-components';
import { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { tapPress, tapPressFirm, easeOut, easeInOut } from '../../theme/motion';
import { useIsMobile } from '../../utils';
import { HeroCard, HeroLabel, HeroValue } from '../../components/HeroCard';
import { Popover } from '../../components/Popover';
import { useToast } from '../../providers/ToastProvider';
import { IconFileUpload, IconFileDownload, IconFileExport } from '@tabler/icons-react';
import { IconPhotoScan, IconX, IconDownload, IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconLink, IconHeartFilled, IconCheck, IconArrowsSort } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import { IconArrowUpRight } from '@tabler/icons-react';
import { SectionWrapper } from '../Home/sections/sectionStyles';
import { FilterBar, CollectionsFilters, defaultFilters } from '../../components';
import { useGetCardsQuery } from '../../api';
import { saveCard } from '../../api/mutations';
import { useTcgArtLookup } from '../../api/tcg/useTcgArtLookup';
import { useTcgPrices } from '../../api/tcg/useTcgPrices';
import { CardModel } from '../../api/fetch/card/cardModel';
import { useAudRate } from '../../hooks/useAudRate';
import { useCurrency, fmtPrice } from '../../hooks/useCurrency';
import * as RadixSelect from '@radix-ui/react-select';
import { SelectTrigger, SelectContent, SelectViewport, SelectItem, SelectChevron } from '../../components/Select';

// ── Shell ─────────────────────────────────────────────────────────────────────

const Main = styled.main`
  background-color: ${({ theme }) => theme.color.surface.muted};
  min-height: 60dvh;
  transition: background-color 200ms cubic-bezier(0.22, 1, 0.36, 1);
`;

const PageHeader = styled.div`
  padding: ${({ theme }) => `${theme.space[6]} 0 ${theme.space[2]}`};
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

const ArtGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => theme.space[4]};
  width: 100%;

  @media (min-width: ${({ theme }) => theme.breakpoint.md}) {
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: ${({ theme }) => theme.space[5]};
  }
`;

const ArtCardItem = styled(motion.div)`
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: ${({ theme }) => theme.color.surface.subtle};
  aspect-ratio: 2.5 / 3.5;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.06);
`;

const ArtCardImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const ArtCardSkeleton = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ theme }) => theme.color.surface.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const ArtCardOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 40%,
    rgba(0, 0, 0, 0.85) 100%
  );
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: ${({ theme }) => theme.space[2]};
  opacity: 0;
`;

const ArtCardName = styled.p`
  color: #fff;
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: capitalize;
`;

const ArtCardMeta = styled.p`
  color: rgba(255, 255, 255, 0.65);
  font-size: ${({ theme }) => theme.typography.size.xs};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: capitalize;
`;

const RecencyDot = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space[2]};
  left: ${({ theme }) => theme.space[2]};
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px 2px 6px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(163, 210, 140, 0.7);
  color: ${({ theme }) => theme.color.aurora.greenLight};
  font-size: ${({ theme }) => theme.typography.size.xxs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  letter-spacing: 0.03em;
  text-transform: uppercase;
  z-index: 2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.aurora.greenLight};
    box-shadow: 0 0 6px rgba(200, 230, 160, 0.8);
  }
`;

function formatRecency(createdAt: number | undefined): string | null {
  if (!createdAt) return null;
  const diffMs = Date.now() - createdAt;
  const day = 1000 * 60 * 60 * 24;
  const days = Math.floor(diffMs / day);
  if (days < 0) return null;
  if (days < 1) return 'New';
  if (days < 7) return `${days}d`;
  return null; // older than a week — don't show
}

const QtyBadge = styled.div`
  position: absolute;
  bottom: ${({ theme }) => theme.space[2]};
  right: ${({ theme }) => theme.space[2]};
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px 3px 5px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  z-index: 2;
  letter-spacing: 0.02em;
`;

// Price badge with dynamic color tiers — all tiers use a dark solid bg with bright accent text for AA contrast
const ArtPriceBadge = styled.div<{ $tier: 'normal' | 'high' | 'ultra' | 'missing' }>`
  position: absolute;
  top: ${({ theme }) => theme.space[2]};
  right: ${({ theme }) => theme.space[2]};
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $tier }) =>
    $tier === 'ultra'   ? 'rgba(30, 12, 4, 0.92)' :
    $tier === 'high'    ? 'rgba(36, 24, 6, 0.92)' :
    $tier === 'missing' ? 'rgba(0, 0, 0, 0.55)' :
                          'rgba(10, 22, 12, 0.88)'};
  backdrop-filter: blur(6px);
  border: 1px solid ${({ $tier }) =>
    $tier === 'ultra'   ? 'rgba(255, 190, 120, 0.85)' :
    $tier === 'high'    ? 'rgba(255, 210, 120, 0.75)' :
    $tier === 'missing' ? 'rgba(255,255,255,0.14)' :
                          'rgba(163, 210, 140, 0.7)'};
  color: ${({ $tier, theme }) =>
    $tier === 'ultra'   ? theme.color.aurora.orangeLight :
    $tier === 'high'    ? theme.color.aurora.yellowLight :
    $tier === 'missing' ? 'rgba(255,255,255,0.5)' :
                          theme.color.aurora.greenLight};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
  box-shadow: ${({ $tier }) =>
    $tier === 'ultra' ? '0 2px 10px rgba(255, 180, 80, 0.22)' :
    $tier === 'high'  ? '0 2px 8px rgba(255, 200, 80, 0.18)' :
                        'none'};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  font-variant-numeric: tabular-nums;
  z-index: 2;
  pointer-events: ${({ $tier }) => $tier === 'missing' ? 'auto' : 'none'};
  cursor: ${({ $tier }) => $tier === 'missing' ? 'help' : 'default'};
`;

// ── Lightbox ──────────────────────────────────────────────────────────────────

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[6]};
`;

const LightboxInner = styled(motion.div)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[5]};
  max-width: 480px;
  width: 100%;
`;

const LightboxImg = styled(motion.img)`
  width: 100%;
  max-width: 320px;
  border-radius: 10px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.08);
  display: block;
`;

const LightboxInfo = styled(motion.div)`
  text-align: center;
  color: #fff;
`;

const LightboxName = styled.h2`
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  margin: 0 0 ${({ theme }) => theme.space[2]};
  text-transform: capitalize;
`;

const LightboxTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  justify-content: center;
`;

const Tag = styled.span`
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  text-transform: capitalize;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PriceTag = styled.span<{ $tier?: 'normal' | 'high' | 'ultra' | 'graded' | 'missing' }>`
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $tier }) =>
    $tier === 'graded'  ? 'rgba(32, 22, 40, 0.92)' :
    $tier === 'ultra'   ? 'rgba(30, 12, 4, 0.92)' :
    $tier === 'high'    ? 'rgba(36, 24, 6, 0.92)' :
    $tier === 'missing' ? 'rgba(255, 255, 255, 0.06)' :
                          'rgba(10, 22, 12, 0.88)'};
  color: ${({ $tier, theme }) =>
    $tier === 'graded'  ? '#e4c6f0' :
    $tier === 'ultra'   ? theme.color.aurora.orangeLight :
    $tier === 'high'    ? theme.color.aurora.yellowLight :
    $tier === 'missing' ? 'rgba(255, 255, 255, 0.45)' :
                          theme.color.aurora.greenLight};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  border: 1px solid ${({ $tier }) =>
    $tier === 'graded'  ? 'rgba(220, 180, 255, 0.55)' :
    $tier === 'ultra'   ? 'rgba(255, 190, 120, 0.85)' :
    $tier === 'high'    ? 'rgba(255, 210, 120, 0.75)' :
    $tier === 'missing' ? 'rgba(255, 255, 255, 0.12)' :
                          'rgba(163, 210, 140, 0.7)'};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
  font-variant-numeric: tabular-nums;
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: -${({ theme }) => theme.space[3]};
  right: -${({ theme }) => theme.space[3]};
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radius.full};
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(4px);

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[16]};
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.lg};
  gap: ${({ theme }) => theme.space[2]};
  text-align: center;
  grid-column: 1 / -1;
`;

const ClearLink = styled.button`
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
  font-family: inherit;
`;

// ── Header row ────────────────────────────────────────────────────────────────

const PageHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  flex-wrap: wrap;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  flex-shrink: 0;

  /* On mobile the actions live inside the summary card, so the header row is
     just the title. */
  @media (max-width: ${({ theme }) => theme.breakpoint.mobile}) {
    display: none;
  }
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: inherit;
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  text-align: left;
  transition: background 120ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover { background: ${({ theme }) => theme.color.surface.muted}; }

  svg {
    color: ${({ theme }) => theme.color.text.secondary};
    flex-shrink: 0;
  }
`;

const MenuItemHint = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.typography.size.xxs};
  color: ${({ theme }) => theme.color.text.tertiary};
  font-weight: ${({ theme }) => theme.typography.weight.regular};
  margin-top: 1px;
`;

// ── Collections-specific summary chrome ─────────────────────────────────────
// (the main hero card uses the shared HeroCard primitives)

const Summary = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[4]};
`;

const SummaryValueRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
`;

// On desktop, currency/export live in the page header so we hide them inside
// the summary card to avoid duplication.
const SummaryActionsMobile = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  flex-shrink: 0;

  @media (min-width: calc(${({ theme }) => theme.breakpoint.mobile} + 1px)) {
    display: none;
  }
`;

const SummaryMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
  font-variant-numeric: tabular-nums;
`;

const SummaryMetaDot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.text.tertiary};
`;

const IconActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.surface.base};
  border: 1.5px solid ${({ theme }) => theme.color.surface.border};
  color: ${({ theme }) => theme.color.text.secondary};
  cursor: pointer;
  transition: all 180ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    border-color: ${({ theme }) => theme.color.frost.blue};
    color: ${({ theme }) => theme.color.frost.blue};
  }
`;


// ── Pagination ────────────────────────────────────────────────────────────────

const PaginationWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[8]} 0 ${theme.space[10]}`};
`;

const PaginationNav = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  flex-wrap: wrap;
  justify-content: center;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
  min-width: 2.25rem;
  height: 2.25rem;
  padding: 0 ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $active, theme }) =>
    $active ? theme.color.frost.blue : theme.color.surface.subtle};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? `0 2px 10px ${theme.color.frost.blue}50`
      : `0 0 0 1px ${theme.color.surface.border}`};
  border: none;
  color: ${({ $active, theme }) =>
    $active ? '#fff' : theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-family: inherit;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1),
    color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover:not(:disabled):not([data-active='true']) {
    box-shadow: 0 0 0 1px ${({ theme }) => theme.color.frost.blue};
    color: ${({ theme }) => theme.color.frost.blue};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    cursor: default;
    opacity: 0.3;
  }
`;

const PageIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0 ${({ theme }) => theme.space[4]};
  height: 2.25rem;
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-variant-numeric: tabular-nums;
  user-select: none;
  letter-spacing: 0.01em;
`;

const PaginationMeta = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.tertiary};
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
`;


const MarkOwnedBtn = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  background: linear-gradient(135deg,
    ${({ theme }) => theme.color.frost.teal} 0%,
    ${({ theme }) => theme.color.frost.blue} 100%);
  color: #fff;
  border: none;
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 6px 18px ${({ theme }) => `${theme.color.frost.blue}55`};
  transition: filter 180ms cubic-bezier(0.22, 1, 0.36, 1);
  letter-spacing: 0.01em;

  &:hover { filter: brightness(1.1); }
  &:disabled { opacity: 0.6; cursor: default; }
`;

const WishlistBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => `${theme.color.aurora.red}20`};
  border: 1px solid ${({ theme }) => `${theme.color.aurora.red}66`};
  color: ${({ theme }) => theme.color.aurora.red};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const DetailLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  text-decoration: none;
  backdrop-filter: blur(6px);
  transition: background 150ms cubic-bezier(0.22, 1, 0.36, 1), border-color 150ms cubic-bezier(0.22, 1, 0.36, 1);
  &:hover {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const ShareBtn = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  font-family: inherit;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 150ms cubic-bezier(0.22, 1, 0.36, 1), border-color 150ms cubic-bezier(0.22, 1, 0.36, 1);
  &:hover {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border: 1.5px solid ${({ theme }) => theme.color.surface.border};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.surface.subtle};
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 150ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms cubic-bezier(0.22, 1, 0.36, 1), background 150ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    border-color: ${({ theme }) => theme.color.frost.blue};
    color: ${({ theme }) => theme.color.frost.blue};
    background: ${({ theme }) => `${theme.color.frost.blue}0c`};
  }
`;

const StatusTabs = styled.div`
  position: relative;
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.surface.subtle};
  box-shadow: 0 0 0 1.5px ${({ theme }) => theme.color.surface.border};
  width: 100%;

  @media (min-width: calc(${({ theme }) => theme.breakpoint.mobile} + 1px)) {
    width: auto;
  }
`;

const StatusTab = styled.button<{ $active: boolean }>`
  position: relative;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border: none;
  background: transparent;
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.color.text.secondary)};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-family: inherit;
  letter-spacing: 0.04em;
  cursor: pointer;
  white-space: nowrap;
  z-index: 1;
  transition: color 240ms cubic-bezier(0.22, 1, 0.36, 1);

  @media (max-width: ${({ theme }) => theme.breakpoint.mobile}) {
    flex: 1;
    text-align: center;
    padding: ${({ theme }) => `${theme.space[2]} ${theme.space[2]}`};
  }
`;

const StatusTabIndicator = styled(motion.span)`
  position: absolute;
  inset: 3px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: linear-gradient(135deg,
    ${({ theme }) => theme.color.frost.blue} 0%,
    ${({ theme }) => theme.color.frost.teal} 100%);
  box-shadow: 0 2px 10px ${({ theme }) => `${theme.color.frost.blue}55`};
  z-index: 0;
  pointer-events: none;
`;

const CurrencyToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border: 1.5px solid ${({ $active, theme }) => $active ? theme.color.frost.blue : theme.color.surface.border};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $active, theme }) => $active ? `${theme.color.frost.blue}12` : theme.color.surface.subtle};
  color: ${({ $active, theme }) => $active ? theme.color.frost.blue : theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  letter-spacing: 0.04em;
  transition: all 150ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    border-color: ${({ theme }) => theme.color.frost.blue};
    color: ${({ theme }) => theme.color.frost.blue};
  }
`;

// ── Tilt card wrapper ─────────────────────────────────────────────────────────

type PriceTier = 'normal' | 'high' | 'ultra' | 'missing';

function getPriceTier(
  usdPrice: number | undefined,
  hasTcgId: boolean,
  isGraded: boolean,
  currency: import('../../hooks/useCurrency').Currency,
  audRate: number,
): PriceTier | null {
  if (isGraded) return null;
  if (!hasTcgId) return null;
  if (usdPrice == null) return 'missing';
  const displayPrice = currency === 'AUD' ? usdPrice * audRate : usdPrice;
  if (displayPrice >= (currency === 'AUD' ? 150 : 100)) return 'ultra';
  if (displayPrice >= (currency === 'AUD' ? 50 : 30)) return 'high';
  return 'normal';
}

const TiltArtCard = memo(function TiltArtCard({ card, imgUrl, artLoading, price, audRate, currency, onSelect, index }: {
  card: CardModel;
  imgUrl: string | null;
  artLoading: boolean;
  price?: number;
  audRate: number;
  currency: import('../../hooks/useCurrency').Currency;
  // Takes the card so the parent can pass ONE stable handler (openLightbox)
  // instead of a fresh `() => openLightbox(card)` per render, which would defeat
  // this memo and re-render all visible cards on any Collections state change.
  onSelect: (card: CardModel) => void;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [12, -12]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-12, 12]), { stiffness: 150, damping: 18 });

  // Handle cached images: if the img is already complete by the time we mount, skip waiting.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [imgUrl]);

  // Reset loaded state when imgUrl changes (e.g., due to list re-order)
  useEffect(() => {
    if (!imgUrl) setLoaded(false);
  }, [imgUrl]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [rawX, rawY]);

  const handleMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  const isGraded = card.attributes.isGraded || (card.attributes.grading ?? 0) > 0;
  const tier = getPriceTier(price, Boolean(card.attributes.tcgId), isGraded, currency, audRate);
  // The card is "ready" for overlays when either the image has actually loaded,
  // OR when we definitively know there's no image to wait for (art lookup is done
  // and there's no imgUrl). During the initial art-lookup window, hasContent is
  // false so the pills don't float over an empty tile.
  const hasContent = loaded || (!imgUrl && !artLoading);

  const recency = formatRecency(card.createdAt);

  // Single atomic "content layer" — img + every overlay lives inside it. The
  // layer's opacity is driven by `hasContent` so the card art and all pills
  // appear in lockstep. Nothing ever shows over a blank tile.
  const contentLayerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    opacity: hasContent ? 1 : 0,
    transition: 'opacity 260ms ease',
    pointerEvents: hasContent ? undefined : 'none',
  };

  return (
    <ArtCardItem
      ref={ref}
      layoutId={`card-art-${card.cardId}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformPerspective: 600, rotateX, rotateY }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 20px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12)' }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.4), ease: easeOut }}
      onClick={() => onSelect(card)}
    >
      {/* Skeleton — always shown until the content layer reveals itself. */}
      {!hasContent && (
        <ArtCardSkeleton aria-hidden='true'>
          <motion.div
            animate={{ opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ position: 'absolute', inset: 0, background: 'currentColor', opacity: 0.1 }}
          />
        </ArtCardSkeleton>
      )}

      {/*
        The image lives inside the content layer regardless of load state so
        that when it finally loads, `setLoaded(true)` flips `hasContent`, and
        the whole layer (image + every pill / badge) fades in together.
      */}
      <div style={contentLayerStyle}>
        {imgUrl ? (
          <ArtCardImg
            ref={imgRef}
            src={imgUrl}
            alt={card.pokemonData.name}
            loading='lazy'
            decoding='async'
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <ArtCardSkeleton aria-hidden='true'>
            <IconPhotoScan size='40%' stroke={1} style={{ opacity: 0.3 }} />
          </ArtCardSkeleton>
        )}

        <ArtCardOverlay
          initial={false}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <ArtCardName>{card.pokemonData.name}</ArtCardName>
          {card.attributes.set && <ArtCardMeta>{card.attributes.set}</ArtCardMeta>}
        </ArtCardOverlay>
        {tier && (
          <ArtPriceBadge
            $tier={tier}
            title={tier === 'missing' ? 'Price not available from TCGPlayer' : undefined}
          >
            {tier === 'missing' ? '—' : fmtPrice(price!, currency, audRate)}
          </ArtPriceBadge>
        )}
        {recency && <RecencyDot>{recency}</RecencyDot>}
        {(card.quantity ?? 1) > 1 && <QtyBadge>×{card.quantity}</QtyBadge>}
      </div>
    </ArtCardItem>
  );
});

// ── Export / import ──────────────────────────────────────────────────────────

/**
 * Lossless JSON backup of the full collection. Round-trips via `importCollectionJson`.
 * Version field lets us migrate between schemas if CardModel shape changes.
 */
function exportCollectionJson(cards: CardModel[]) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: cards.length,
    cards,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `polardex-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Read a JSON file picked by the user, validate its shape, and merge the cards
 * back into Firestore via saveCard. Returns the count of imported cards, or
 * throws on validation failure so the caller can surface a toast.
 */
async function importCollectionJson(file: File): Promise<number> {
  const text = await file.text();
  const parsed = JSON.parse(text) as { cards?: unknown };
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.cards)) {
    throw new Error('Not a valid Polardex backup');
  }
  const cardsToImport = parsed.cards as CardModel[];
  // Light validation — same shape check as useGetCardsQuery's guard
  const valid = cardsToImport.filter(
    (c) => c?.cardId && c?.pokemonData?.name && c?.attributes?.set,
  );
  // Import sequentially so a failure stops us mid-merge rather than
  // leaving the Firestore doc partially updated.
  for (const card of valid) {
    await saveCard(card);
  }
  return valid.length;
}

function exportCollectionCsv(cards: CardModel[], audRate: number) {
  const headers = ['Name', 'Type', 'Set', 'Rarity', 'Condition', 'Quantity', 'Variants', 'Market Price (USD)', 'Market Price (AUD)', 'TCG ID'];
  const rows = cards.map((c) => {
    const v = c.attributes.variants;
    const variants = v
      ? [v.normal && 'Normal', (v.alternate ?? v.reverseHolo) && 'Alternate']
          .filter(Boolean).join(' + ') || 'Normal'
      : 'Normal';
    const usd = c.attributes.marketPrice;
    return [
      c.pokemonData.name,
      c.pokemonData.type,
      c.attributes.set,
      c.attributes.rarity ?? '',
      c.attributes.condition,
      c.quantity ?? 1,
      variants,
      usd != null ? usd.toFixed(2) : '',
      usd != null ? (usd * audRate).toFixed(2) : '',
      c.attributes.tcgId ?? '',
    ].map((val) => {
      // Guard against CSV formula injection: a leading = + - @ (or tab/CR) makes
      // a spreadsheet treat the cell as a formula. Prefix those with an apostrophe.
      let s = String(val);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    }).join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `polardex-collection-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sort options ──────────────────────────────────────────────────────────────

type SortKey = 'default' | 'name-asc' | 'name-desc' | 'price-high' | 'price-low' | 'set';

const SORT_LABELS: Record<SortKey, string> = {
  'default':    'Default',
  'name-asc':  'Name A → Z',
  'name-desc': 'Name Z → A',
  'price-high':'Price High → Low',
  'price-low': 'Price Low → High',
  'set':       'Set',
};

// ── Component ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 48;

export function Collections() {
  const { cards, loading } = useGetCardsQuery();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initial state is hydrated from URL params so filters/sort/page survive
  // refresh and can be bookmarked/shared.
  const [filters, setFilters] = useState<CollectionsFilters>(() => ({
    search: searchParams.get('q') ?? defaultFilters.search,
    set: searchParams.get('set') ?? defaultFilters.set,
    condition: searchParams.get('cond') ?? defaultFilters.condition,
    type: searchParams.get('type') ?? defaultFilters.type,
  }));
  const [selected, setSelected] = useState<CardModel | null>(null);
  const [sort, setSort] = useState<SortKey>(
    () => (searchParams.get('sort') as SortKey) || 'default',
  );
  const [currentPage, setCurrentPage] = useState(() => {
    const raw = Number(searchParams.get('page'));
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'owned' | 'wishlist'>(() => {
    const v = searchParams.get('status');
    return v === 'owned' || v === 'wishlist' ? v : 'all';
  });

  // URL → state sync for status: external navigation (e.g., the command
  // palette's "Show Wishlist" item) only mutates searchParams, so useState's
  // initializer doesn't re-run. Without this, /collections?status=wishlist
  // lands but the tab stays on "All".
  useEffect(() => {
    const v = searchParams.get('status');
    const next = v === 'owned' || v === 'wishlist' ? v : 'all';
    if (next !== statusFilter) setStatusFilter(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [copied, setCopied] = useState(false);
  const audRate = useAudRate();
  const { currency, toggle: toggleCurrency } = useCurrency();
  const isMobile = useIsMobile();
  const gridTopRef = useRef<HTMLDivElement>(null);

  // Sync state → URL search params so back/forward and refresh preserve the
  // user's view. We build the params from scratch each time, preserving only
  // the `?card=` deep-link param used by the lightbox share feature.
  useEffect(() => {
    const next = new URLSearchParams();
    const sharedCard = searchParams.get('card');
    if (sharedCard) next.set('card', sharedCard);
    if (filters.search) next.set('q', filters.search);
    if (filters.set) next.set('set', filters.set);
    if (filters.condition) next.set('cond', filters.condition);
    if (filters.type) next.set('type', filters.type);
    if (sort !== 'default') next.set('sort', sort);
    if (statusFilter !== 'all') next.set('status', statusFilter);
    if (currentPage > 1) next.set('page', String(currentPage));
    // Only write if something actually changed — avoids redundant history pushes.
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, statusFilter, currentPage]);

  // Live market prices
  const tcgIds = useMemo(
    () => cards.map((c) => c.attributes.tcgId).filter((id): id is string => Boolean(id)),
    [cards],
  );
  const { priceMap } = useTcgPrices(tcgIds);

  const typeOptions = useMemo(
    () => [...new Set(cards.map((c) => c.pokemonData.type).filter(Boolean))].sort(),
    [cards]
  );
  const setOptions = useMemo(
    () => [...new Set(cards.map((c) => c.attributes.set).filter(Boolean))].sort(),
    [cards]
  );
  const conditionOptions = useMemo(
    () => [...new Set(cards.map((c) => c.attributes.condition).filter(Boolean))].sort(),
    [cards]
  );

  // Filter + sort
  const filteredCards = useMemo(() => {
    const filtered = cards.filter((card) => {
      const status = card.status ?? 'owned';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      const search = filters.search.toLowerCase();
      if (search && !card.pokemonData.name.toLowerCase().includes(search)) return false;
      if (filters.type && card.pokemonData.type !== filters.type) return false;
      if (filters.set && card.attributes.set !== filters.set) return false;
      if (filters.condition && card.attributes.condition !== filters.condition) return false;
      return true;
    });

    if (sort === 'name-asc') return [...filtered].sort((a, b) => a.pokemonData.name.localeCompare(b.pokemonData.name));
    if (sort === 'name-desc') return [...filtered].sort((a, b) => b.pokemonData.name.localeCompare(a.pokemonData.name));
    if (sort === 'set') return [...filtered].sort((a, b) => a.attributes.set.localeCompare(b.attributes.set));
    if (sort === 'price-high') return [...filtered].sort((a, b) => {
      const pa = a.attributes.tcgId ? (priceMap.get(a.attributes.tcgId) ?? -1) : -1;
      const pb = b.attributes.tcgId ? (priceMap.get(b.attributes.tcgId) ?? -1) : -1;
      return pb - pa;
    });
    if (sort === 'price-low') return [...filtered].sort((a, b) => {
      const pa = a.attributes.tcgId ? (priceMap.get(a.attributes.tcgId) ?? Infinity) : Infinity;
      const pb = b.attributes.tcgId ? (priceMap.get(b.attributes.tcgId) ?? Infinity) : Infinity;
      return pa - pb;
    });
    return filtered;
  }, [cards, filters, sort, priceMap, statusFilter]);

  // Counts per status (derived before search/filter is applied — reflects totals)
  const statusCounts = useMemo(() => {
    let owned = 0;
    let wishlist = 0;
    for (const c of cards) {
      if ((c.status ?? 'owned') === 'wishlist') wishlist++;
      else owned++;
    }
    return { all: cards.length, owned, wishlist };
  }, [cards]);

  // Totals keyed by status — the hero card picks which one to show based on
  // the active status tab (all / owned / wishlist) so the headline number
  // always matches what's being filtered.
  const valueByStatus = useMemo(() => {
    let owned = 0;
    let wishlist = 0;
    for (const c of cards) {
      const id = c.attributes.tcgId;
      if (!id) continue;
      const p = priceMap.get(id);
      if (!p) continue;
      const line = p * (c.quantity ?? 1);
      if ((c.status ?? 'owned') === 'wishlist') wishlist += line;
      else owned += line;
    }
    return { owned, wishlist, all: owned + wishlist };
  }, [cards, priceMap]);
  const collectionValueUsd = valueByStatus[statusFilter];

  // Reset to page 1 when filters, sort, or status tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE));
  const pagedCards = useMemo(
    () => filteredCards.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredCards, currentPage],
  );

  // Art lookup ONLY for the visible page (+ the deep-linked lightbox card), and
  // only for cards without a stored TCG image. Avoids sequentially fetching
  // artwork for the entire (~786-card) filtered list on every Collections view.
  const cardNames = useMemo(() => {
    const names = new Set<string>();
    for (const c of pagedCards) {
      if (!c.attributes.tcgImageUrl) names.add(c.pokemonData.name);
    }
    if (selected && !selected.attributes.tcgImageUrl) {
      names.add(selected.pokemonData.name);
    }
    return [...names];
  }, [pagedCards, selected]);
  const { artMap, loading: artLoading } = useTcgArtLookup(cardNames, true);

  // If the user was on a page that no longer exists (e.g. after filter), clamp
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll the whole window to the top on page change so the user lands at the Collection header
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, []);

  // Close lightbox on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
    }
    if (selected) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Deep-link: if ?card=<id> is set on mount/update, open the matching card
  useEffect(() => {
    const shared = searchParams.get('card');
    if (!shared || !cards.length) return;
    if (selected && (selected.attributes.tcgId === shared || selected.cardId === shared)) return;
    const match = cards.find((c) => c.attributes.tcgId === shared || c.cardId === shared);
    if (match) setSelected(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, searchParams]);

  const openLightbox = useCallback((card: CardModel) => {
    setSelected(card);
    const id = card.attributes.tcgId ?? card.cardId;
    const next = new URLSearchParams(searchParams);
    next.set('card', id);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const closeLightbox = useCallback(() => {
    setSelected(null);
    const next = new URLSearchParams(searchParams);
    next.delete('card');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const [marking, setMarking] = useState(false);

  const markSelectedAsOwned = useCallback(async () => {
    if (!selected || selected.status !== 'wishlist') return;
    setMarking(true);
    try {
      // Promote in-place — preserve cardId, createdAt, attributes etc.
      await saveCard({
        ...selected,
        status: 'owned',
        quantity: Math.max(1, selected.quantity ?? 1),
      });
      // Optimistically update the lightbox state so the badge flips immediately;
      // useGetCardsQuery will catch up on the next snapshot.
      setSelected({ ...selected, status: 'owned' });
    } finally {
      setMarking(false);
    }
  }, [selected]);

  const copyShareLink = useCallback(() => {
    if (!selected) return;
    const id = selected.attributes.tcgId ?? selected.cardId;
    const url = `${window.location.origin}${window.location.pathname}?card=${encodeURIComponent(id)}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }, [selected]);

  const getImgUrl = useCallback(
    (card: CardModel) =>
      card.attributes.tcgImageUrl ||
      artMap[card.pokemonData.name.toLowerCase()] ||
      null,
    [artMap],
  );

  const { toast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);

  const onImportFileChosen = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Reset so picking the same file again re-fires
      e.target.value = '';
      try {
        const count = await importCollectionJson(file);
        toast({
          message: `Imported ${count} card${count !== 1 ? 's' : ''}`,
          tone: 'success',
        });
      } catch (err) {
        toast({
          message: (err as Error).message || 'Import failed',
          tone: 'error',
        });
      }
    },
    [toast],
  );

  // Sort control JSX (shared between desktop row and mobile filter drawer)
  const sortSelect = (
    <RadixSelect.Root value={sort} onValueChange={(v) => setSort(v as SortKey)}>
      <SelectTrigger $variant='pill' aria-label='Sort cards'>
        <IconArrowsSort size={14} stroke={2} style={{ opacity: 0.7 }} />
        <RadixSelect.Value />
        <SelectChevron />
      </SelectTrigger>
      <RadixSelect.Portal>
        <SelectContent position='popper' sideOffset={6}>
          <SelectViewport>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                <RadixSelect.ItemText>{SORT_LABELS[key]}</RadixSelect.ItemText>
              </SelectItem>
            ))}
          </SelectViewport>
        </SelectContent>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );

  return (
    <Main>
      <section>
        <SectionWrapper>
          <PageHeader>
            <PageHeaderRow>
              <div>
                <PageTitle>Collection</PageTitle>
                <PageSubtitle>Browse and filter your Pokémon card library.</PageSubtitle>
              </div>
              {/* Desktop actions row — hidden on mobile via CSS in HeaderActions */}
              <HeaderActions>
                {!isMobile && cards.length > 0 && (
                  <StatusTabs role='tablist' aria-label='Collection status'>
                    {(['all', 'owned', 'wishlist'] as const).map((key) => (
                      <StatusTab
                        key={key}
                        role='tab'
                        aria-selected={statusFilter === key}
                        $active={statusFilter === key}
                        onClick={() => setStatusFilter(key)}
                      >
                        {statusFilter === key && (
                          <StatusTabIndicator
                            layoutId='status-tab-indicator'
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          />
                        )}
                        <span style={{ position: 'relative', zIndex: 1 }}>
                          {key === 'all' && `All · ${statusCounts.all}`}
                          {key === 'owned' && `Owned · ${statusCounts.owned}`}
                          {key === 'wishlist' && `Wishlist · ${statusCounts.wishlist}`}
                        </span>
                      </StatusTab>
                    ))}
                  </StatusTabs>
                )}
                <CurrencyToggle $active={currency === 'AUD'} onClick={toggleCurrency} title='Toggle currency'>
                  {currency}
                </CurrencyToggle>
                <Popover
                  align='right'
                  maxWidth='18rem'
                  trigger={({ onClick, isOpen }) => (
                    <ActionBtn
                      onClick={onClick}
                      aria-haspopup='menu'
                      aria-expanded={isOpen}
                      title='Backup and restore'
                    >
                      <IconFileExport size={14} stroke={2} />
                      Data
                    </ActionBtn>
                  )}
                >
                  {cards.length > 0 && (
                    <>
                      <MenuItem
                        onClick={() => exportCollectionCsv(cards, audRate)}
                      >
                        <IconDownload size={16} stroke={2} />
                        <div>
                          Export as CSV
                          <MenuItemHint>For spreadsheets</MenuItemHint>
                        </div>
                      </MenuItem>
                      <MenuItem
                        onClick={() => exportCollectionJson(cards)}
                      >
                        <IconFileDownload size={16} stroke={2} />
                        <div>
                          Export as JSON
                          <MenuItemHint>Full lossless backup</MenuItemHint>
                        </div>
                      </MenuItem>
                    </>
                  )}
                  <MenuItem onClick={() => importInputRef.current?.click()}>
                    <IconFileUpload size={16} stroke={2} />
                    <div>
                      Import JSON backup
                      <MenuItemHint>Merge cards into collection</MenuItemHint>
                    </div>
                  </MenuItem>
                </Popover>
                <input
                  ref={importInputRef}
                  type='file'
                  accept='application/json'
                  onChange={onImportFileChosen}
                  style={{ display: 'none' }}
                />
              </HeaderActions>
            </PageHeaderRow>

            {/* Unified summary card — same hero design on mobile and desktop.
                On mobile the currency/export actions appear inside the card; on
                desktop they live in the page header (above) so the card stays
                clean. The status tabs render below the card on mobile only. */}
            {cards.length > 0 && (
              <Summary
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.05 }}
              >
                <HeroCard accent='teal' noAnimation>
                  <HeroLabel>
                    {statusFilter === 'wishlist'
                      ? 'Wishlist value'
                      : statusFilter === 'owned'
                        ? 'Owned value'
                        : 'Total value'}
                  </HeroLabel>
                  <SummaryValueRow>
                    <HeroValue>
                      {collectionValueUsd > 0
                        ? fmtPrice(collectionValueUsd, currency, audRate)
                        : '—'}
                    </HeroValue>
                    <SummaryActionsMobile>
                      <CurrencyToggle
                        $active={currency === 'AUD'}
                        onClick={toggleCurrency}
                        title='Toggle currency'
                      >
                        {currency}
                      </CurrencyToggle>
                      <IconActionBtn
                        onClick={() => exportCollectionCsv(cards, audRate)}
                        title='Export to CSV'
                        aria-label='Export to CSV'
                      >
                        <IconDownload size={14} stroke={2} />
                      </IconActionBtn>
                    </SummaryActionsMobile>
                  </SummaryValueRow>
                  <SummaryMetaRow>
                    <span>{statusCounts.owned} owned</span>
                    <SummaryMetaDot />
                    <span>{setOptions.length} set{setOptions.length !== 1 ? 's' : ''}</span>
                    {statusCounts.wishlist > 0 && (
                      <>
                        <SummaryMetaDot />
                        <span>{statusCounts.wishlist} wishlist</span>
                      </>
                    )}
                  </SummaryMetaRow>
                </HeroCard>
                {isMobile && (
                  <StatusTabs role='tablist' aria-label='Collection status'>
                    {(['all', 'owned', 'wishlist'] as const).map((key) => (
                      <StatusTab
                        key={key}
                        role='tab'
                        aria-selected={statusFilter === key}
                        $active={statusFilter === key}
                        onClick={() => setStatusFilter(key)}
                      >
                        {statusFilter === key && (
                          <StatusTabIndicator
                            layoutId='status-tab-indicator-mobile'
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          />
                        )}
                        <span style={{ position: 'relative', zIndex: 1 }}>
                          {key === 'all' && `All · ${statusCounts.all}`}
                          {key === 'owned' && `Owned · ${statusCounts.owned}`}
                          {key === 'wishlist' && `Wishlist · ${statusCounts.wishlist}`}
                        </span>
                      </StatusTab>
                    ))}
                  </StatusTabs>
                )}
              </Summary>
            )}
          </PageHeader>

          <FilterBar
            filters={filters}
            onChange={setFilters}
            typeOptions={typeOptions}
            setOptions={setOptions}
            conditionOptions={conditionOptions}
            totalCount={cards.length}
            filteredCount={filteredCards.length}
            sortControl={sortSelect}
          />

          <AnimatePresence mode='wait'>
            {loading ? (
              <ArtGrid key='skeleton'>
                {Array.from({ length: 24 }).map((_, i) => (
                  <ArtCardItem
                    key={i}
                    animate={{ opacity: [0.35, 0.65, 0.35] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: (i % 8) * 0.1, ease: easeInOut }}
                  >
                    <ArtCardSkeleton />
                  </ArtCardItem>
                ))}
              </ArtGrid>
            ) : cards.length === 0 ? (
              <div key='no-cards' style={{ display: 'grid' }}>
                <EmptyState>
                  <span>Your collection is empty.</span>
                  <span style={{ fontSize: '0.9em', opacity: 0.7 }}>
                    Head to Studio or Sets to add your first card.
                  </span>
                </EmptyState>
              </div>
            ) : filteredCards.length === 0 ? (
              <div key='empty' style={{ display: 'grid' }}>
                <EmptyState>
                  {statusFilter === 'wishlist' && statusCounts.wishlist === 0 ? (
                    <>
                      <span>Your wishlist is empty.</span>
                      <span style={{ fontSize: '0.9em', opacity: 0.7, textAlign: 'center', maxWidth: '24rem' }}>
                        Tap the heart icon on any card in the Sets page to add it to your wishlist.
                      </span>
                      <ClearLink onClick={() => window.location.assign('/sets')}>
                        Browse sets →
                      </ClearLink>
                    </>
                  ) : statusFilter === 'owned' && statusCounts.owned === 0 ? (
                    <>
                      <span>You haven’t added any owned cards yet.</span>
                      <span style={{ fontSize: '0.9em', opacity: 0.7 }}>
                        Head to Studio or Sets to add your first card.
                      </span>
                    </>
                  ) : (
                    <>
                      <span>No cards match your filters.</span>
                      <ClearLink onClick={() => setFilters(defaultFilters)}>
                        Clear filters
                      </ClearLink>
                    </>
                  )}
                </EmptyState>
              </div>
            ) : (
              <motion.div
                key={`grid-${currentPage}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div ref={gridTopRef} aria-hidden='true' />
                <ArtGrid>
                  {pagedCards.map((card, i) => {
                    const imgUrl = getImgUrl(card);
                    const price = card.attributes.tcgId ? priceMap.get(card.attributes.tcgId) : undefined;
                    return (
                      <TiltArtCard
                        key={card.cardId}
                        index={i}
                        card={card}
                        imgUrl={imgUrl}
                        artLoading={artLoading}
                        price={price}
                        audRate={audRate}
                        currency={currency}
                        onSelect={openLightbox}
                      />
                    );
                  })}
                </ArtGrid>
                {totalPages > 1 && (
                  <PaginationWrap>
                    <PaginationNav aria-label='Pagination'>
                      <PageBtn
                        onClick={() => currentPage !== 1 && goToPage(1)}
                        disabled={currentPage === 1}
                        aria-label='First page'
                        title='First page'
                      >
                        <IconChevronsLeft size={14} stroke={2.5} />
                      </PageBtn>
                      <PageBtn
                        onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label='Previous page'
                        title='Previous page'
                      >
                        <IconChevronLeft size={14} stroke={2.5} />
                      </PageBtn>
                      <PageIndicator>
                        Page {currentPage} of {totalPages}
                      </PageIndicator>
                      <PageBtn
                        onClick={() => currentPage < totalPages && goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label='Next page'
                        title='Next page'
                      >
                        <IconChevronRight size={14} stroke={2.5} />
                      </PageBtn>
                      <PageBtn
                        onClick={() => currentPage !== totalPages && goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        aria-label='Last page'
                        title='Last page'
                      >
                        <IconChevronsRight size={14} stroke={2.5} />
                      </PageBtn>
                    </PaginationNav>
                    <PaginationMeta>
                      Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCards.length)} of {filteredCards.length}
                    </PaginationMeta>
                  </PaginationWrap>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </SectionWrapper>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (() => {
          const imgUrl = getImgUrl(selected);
          const selectedPriceUsd = selected.attributes.tcgId ? priceMap.get(selected.attributes.tcgId) : undefined;
          const isGraded = selected.attributes.isGraded || (selected.attributes.grading ?? 0) > 0;
          const tier = getPriceTier(selectedPriceUsd, Boolean(selected.attributes.tcgId), isGraded, currency, audRate);
          const tags = [
            selected.attributes.set,
            selected.attributes.condition,
            selected.pokemonData.type,
            selected.attributes.grading ? `PSA/BGS ${selected.attributes.grading}` : undefined,
          ].filter(Boolean) as string[];

          return (
            <Backdrop
              key='backdrop'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeLightbox}
            >
              <LightboxInner
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              >
                <CloseButton
                  className='icon-close'
                  onClick={closeLightbox}
                  whileTap={tapPressFirm}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  <IconX size={14} stroke={2.5} />
                </CloseButton>

                {imgUrl ? (
                  <LightboxImg
                    layoutId={`card-art-${selected.cardId}`}
                    src={imgUrl}
                    alt={selected.pokemonData.name}
                  />
                ) : (
                  <LightboxImg
                    as={motion.div}
                    layoutId={`card-art-${selected.cardId}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.05)',
                      aspectRatio: '2.5/3.5',
                      color: 'rgba(255,255,255,0.25)',
                    }}
                  >
                    <IconPhotoScan size='40%' stroke={1} />
                  </LightboxImg>
                )}

                <LightboxInfo
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.25 }}
                >
                  <LightboxName>{selected.pokemonData.name}</LightboxName>
                  {selected.status === 'wishlist' && (
                    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                      <WishlistBadge>
                        <IconHeartFilled size={11} />
                        On wishlist
                      </WishlistBadge>
                    </div>
                  )}
                  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                    {isGraded ? (
                      <PriceTag $tier='graded'>Graded — raw price not applicable</PriceTag>
                    ) : tier === 'missing' ? (
                      <PriceTag $tier='missing'>Price not found in TCGPlayer</PriceTag>
                    ) : selectedPriceUsd != null ? (
                      <PriceTag $tier={tier ?? 'normal'}>
                        {fmtPrice(selectedPriceUsd, currency, audRate)} raw market
                      </PriceTag>
                    ) : null}
                  </div>
                  {tags.length > 0 && (
                    <LightboxTags>
                      {tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                    </LightboxTags>
                  )}
                  {selected.status === 'wishlist' && (
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                      <MarkOwnedBtn
                        onClick={markSelectedAsOwned}
                        disabled={marking}
                        whileTap={tapPress}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      >
                        <IconCheck size={14} stroke={2.5} />
                        {marking ? 'Marking…' : 'Mark as owned'}
                      </MarkOwnedBtn>
                    </div>
                  )}
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <DetailLink
                      to={`/collections/${encodeURIComponent(selected.cardId)}`}
                      onClick={closeLightbox}
                      className='icon-arr-r'
                    >
                      View full details
                      <IconArrowUpRight size={13} stroke={2} />
                    </DetailLink>
                  </div>
                  {selected.attributes.tcgId && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                      <ShareBtn
                        onClick={copyShareLink}
                        whileTap={tapPress}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      >
                        <IconLink size={13} stroke={2} />
                        {copied ? 'Link copied!' : 'Copy share link'}
                      </ShareBtn>
                    </div>
                  )}
                </LightboxInfo>
              </LightboxInner>
            </Backdrop>
          );
        })()}
      </AnimatePresence>
    </Main>
  );
}
