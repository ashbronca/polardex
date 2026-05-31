import { useState, ReactNode, useRef, useEffect, useMemo, Dispatch, SetStateAction } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconSearch,
  IconTrash,
  IconAlertTriangle,
  IconChevronDown,
  IconCheck,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import * as RadixSelect from '@radix-ui/react-select';
import { Button } from '../../../components';
import { tapPress } from '../../../theme/motion';
import { useGetCardsQuery } from '../../../api';
import { CardModel } from '../../../api/fetch/card/cardModel';
import { CardDraft, AttributeDraft } from './StudioModal';
import { POKEMON_TYPES, CARD_TYPES, CARD_RARITIES, CARD_CONDITIONS } from '../../../constants/cardOptions';
import { usePokemonSetsQuery } from '../../../api/tcg/usePokemonSetsQuery';
import { usePokemonSearch, fetchPokemonDetail, PokedexEntry } from '../../../api/pokeapi/usePokemonSearch';
import { toSpriteName } from '../../../utils';

// ── Props ─────────────────────────────────────────────────────────────────────

interface StudioModalDialogProps {
  type: string;
  cardDraft: CardDraft;
  attributeDraft: AttributeDraft;
  // Accepts the functional updater form so async patches (e.g. the post-fetch
  // type fill) don't clobber edits the user made during the await.
  onCardDraftChange: Dispatch<SetStateAction<CardDraft>>;
  onAttributeDraftChange: (draft: AttributeDraft) => void;
  onCardSelect: (card: CardModel) => void;
  onSave: () => void;
  onSaveDraft: (draft: CardDraft) => void;
  onDelete: () => void;
  saving: boolean;
  canDelete: boolean;
}

// ── TCG art search types ───────────────────────────────────────────────────────

interface TcgArtResult {
  id: string;
  name: string;
  set: string;
  setTotal: number;
  number: string;
  rarity: string;
  releaseYear: string;
  image: string;
}

// ── Form primitives ───────────────────────────────────────────────────────────

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  flex: 1;
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.space[1]};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.color.text.primary};
  margin: 0 0 ${({ theme }) => theme.space[1]} 0;
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.secondary};
  margin: 0;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
`;

const FieldLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.color.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.07em;
`;

const Input = styled.input`
  height: 2.5rem;
  padding: 0 ${({ theme }) => theme.space[3]};
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  outline: none;
  font-family: inherit;
  font-size: ${({ theme }) => theme.typography.size.sm};
  width: 100%;
  box-shadow: 0 0 0 1.5px transparent;
  transition: box-shadow 150ms cubic-bezier(0.22, 1, 0.36, 1), background-color 150ms cubic-bezier(0.22, 1, 0.36, 1);
  background-color: ${({ theme }) => theme.color.surface.muted};
  color: ${({ theme }) => theme.color.text.primary};
  box-sizing: border-box;

  &::placeholder { color: ${({ theme }) => theme.color.text.tertiary}; }
  &:focus {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.frost.blue};
    background-color: ${({ theme }) => theme.color.surface.base};
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]};
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.color.surface.muted};
  margin: ${({ theme }) => `${theme.space[1]} 0`};
`;

const VariantToggleRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]};
`;

const VariantToggle = styled.button<{ $active: boolean }>`
  flex: 1;
  height: 2.5rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1.5px solid ${({ $active, theme }) =>
    $active ? theme.color.aurora.purple : theme.color.surface.border};
  background: ${({ $active, theme }) =>
    $active ? `${theme.color.aurora.purple}18` : theme.color.surface.muted};
  color: ${({ $active, theme }) =>
    $active ? theme.color.aurora.purple : theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-family: inherit;
  cursor: pointer;
  transition: border-color 150ms cubic-bezier(0.22, 1, 0.36, 1), background 150ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    border-color: ${({ theme }) => theme.color.aurora.purple};
    color: ${({ theme }) => theme.color.aurora.purple};
  }
`;

const Footer = styled.div`
  margin-top: auto;
  padding-top: ${({ theme }) => theme.space[3]};
  border-top: 1px solid ${({ theme }) => theme.color.surface.muted};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

// Radix Select primitives are imported from the shared component module —
// there used to be a copy of them here. The local CheckIcon alias is kept
// for backwards compat with existing JSX call sites.
import {
  SelectTrigger,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectCheckIndicator as CheckIcon,
} from '../../../components/Select';

// ── Card search dropdown ───────────────────────────────────────────────────────

const SearchWrapper = styled.div`
  position: relative;
`;

const SearchIconWrap = styled.span`
  position: absolute;
  left: ${({ theme }) => theme.space[3]};
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.color.text.secondary};
  display: flex;
  pointer-events: none;
`;

const SearchInput = styled(Input)`
  padding-left: 2.5rem;
`;

const Dropdown = styled(motion.ul)`
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.space[1]});
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.color.surface.base};
  border: 1.5px solid ${({ theme }) => theme.color.surface.muted};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  padding: ${({ theme }) => theme.space[1]};
  list-style: none;
  margin: 0;
  z-index: 50;
  max-height: 14rem;
  overflow-y: auto;
`;

const DropdownItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: background-color 80ms cubic-bezier(0.22, 1, 0.36, 1);
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.primary};

  &:hover { background: ${({ theme }) => theme.color.surface.muted}; }
`;

const DropdownThumb = styled.img`
  width: 2rem;
  height: 2rem;
  object-fit: contain;
  flex-shrink: 0;
`;

const DropdownName = styled.span`
  flex: 1;
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  text-transform: capitalize;
`;

const TypeBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.frost.blue};
  background: ${({ theme }) => `${theme.color.frost.blue}15`};
  padding: ${({ theme }) => `2px ${theme.space[2]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  white-space: nowrap;
  text-transform: capitalize;
`;

// ── Pokédex autocomplete ──────────────────────────────────────────────────────

const PokemonSuggestion = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: background-color 80ms cubic-bezier(0.22, 1, 0.36, 1);
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.primary};

  &:hover, &[data-highlighted] { background: ${({ theme }) => theme.color.surface.muted}; }
`;

const PokemonSprite = styled.img`
  width: 2.25rem;
  height: 2.25rem;
  object-fit: contain;
  flex-shrink: 0;
  image-rendering: pixelated;
`;

const PokemonSuggestionName = styled.span`
  flex: 1;
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const PokemonSuggestionId = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
  font-variant-numeric: tabular-nums;
`;

const AutoFilledBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.aurora.green};
  background: ${({ theme }) => `${theme.color.aurora.green}15`};
  padding: ${({ theme }) => `1px ${theme.space[2]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

// ── Set search dropdown ───────────────────────────────────────────────────────

const SetDropdownItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: background-color 80ms cubic-bezier(0.22, 1, 0.36, 1);
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.primary};

  &:hover { background: ${({ theme }) => theme.color.surface.muted}; }
`;

// ── TCG Art picker ────────────────────────────────────────────────────────────

const QuantityStepper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
`;

const StepBtn = styled.button`
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1.5px solid ${({ theme }) => theme.color.surface.border};
  background: ${({ theme }) => theme.color.surface.subtle};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 120ms cubic-bezier(0.22, 1, 0.36, 1), background 120ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.color.frost.blue};
    background: ${({ theme }) => `${theme.color.frost.blue}12`};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const QtyDisplay = styled.span`
  min-width: 2rem;
  text-align: center;
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.color.text.primary};
`;

const ArtSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const ArtSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ArtSearchButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border: 1.5px solid ${({ theme }) => theme.color.surface.muted};
  border-radius: ${({ theme }) => theme.radius.full};
  background: transparent;
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  font-family: inherit;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transition.fast},
    color ${({ theme }) => theme.transition.fast};

  &:hover {
    border-color: ${({ theme }) => theme.color.frost.blue};
    color: ${({ theme }) => theme.color.frost.blue};
  }
`;

const ArtGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr));
  gap: ${({ theme }) => theme.space[2]};
`;

const ArtCard = styled(motion.button)<{ $selected: boolean }>`
  position: relative;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  background: ${({ theme }) => theme.color.surface.muted};
  box-shadow: ${({ $selected, theme }) =>
    $selected ? `0 0 0 2.5px ${theme.color.frost.blue}` : theme.shadow.sm};
  transition: box-shadow 150ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover { box-shadow: ${({ theme }) => theme.shadow.md}; }
`;

const ArtImg = styled.img`
  width: 100%;
  display: block;
  border-radius: ${({ theme }) => theme.radius.md};
`;

const ArtSelectedBadge = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space[1]};
  right: ${({ theme }) => theme.space[1]};
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.frost.blue};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ArtLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.secondary};
`;

const StockArtButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border: 1.5px solid ${({ theme }) => theme.color.surface.border};
  border-radius: ${({ theme }) => theme.radius.full};
  background: transparent;
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-family: inherit;
  cursor: pointer;
  transition: border-color 150ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms cubic-bezier(0.22, 1, 0.36, 1), background 150ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    border-color: ${({ theme }) => theme.color.frost.blue};
    color: ${({ theme }) => theme.color.frost.blue};
    background: ${({ theme }) => `${theme.color.frost.blue}12`};
  }
`;

const ArtSelectedPreview = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => `${theme.color.frost.blue}10`};
  border: 1px solid ${({ theme }) => `${theme.color.frost.blue}25`};
`;

const ArtPreviewImg = styled.img`
  width: 3rem;
  height: auto;
  border-radius: ${({ theme }) => theme.radius.sm};
  object-fit: contain;
`;

const ArtPreviewText = styled.div`
  flex: 1;
  min-width: 0;
`;

const ArtPreviewName = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.color.frost.blue};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ArtPreviewSet = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ClearArtButton = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text.secondary};
  padding: ${({ theme }) => theme.space[1]};
  border-radius: ${({ theme }) => theme.radius.sm};
  transition: color ${({ theme }) => theme.transition.fast};

  &:hover { color: ${({ theme }) => theme.color.text.primary}; }
`;

// ── Delete confirmation ───────────────────────────────────────────────────────

const DeleteSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => `${theme.color.aurora.red}0c`};
  border: 1px solid ${({ theme }) => `${theme.color.aurora.red}25`};
`;

const DeleteWarning = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.aurora.red};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const DeleteActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]};
`;

const DeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border: 1.5px solid ${({ theme }) => theme.color.text.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-family: inherit;
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transition.fast},
    color ${({ theme }) => theme.transition.fast},
    background ${({ theme }) => theme.transition.fast};

  &:hover {
    border-color: ${({ theme }) => theme.color.aurora.red};
    color: ${({ theme }) => theme.color.aurora.red};
    background: ${({ theme }) => `${theme.color.aurora.red}0c`};
  }
`;

const ConfirmDeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.aurora.red};
  color: #ffffff;
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-family: inherit;
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  transition: opacity ${({ theme }) => theme.transition.fast};

  &:hover { opacity: 0.85; }
`;

const CancelButton = styled(ConfirmDeleteButton)`
  background: ${({ theme }) => theme.color.surface.muted};
  color: ${({ theme }) => theme.color.text.primary};
`;

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <FieldGroup>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </FieldGroup>
  );
}

// ── StudioSelect component ────────────────────────────────────────────────────

function StudioSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <RadixSelect.Root
      value={value || ''}
      onValueChange={(v) => onValueChange(v === '__none__' ? '' : v)}
    >
      <SelectTrigger>
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon style={{ display: 'flex', color: 'inherit', opacity: 0.5 }}>
          <IconChevronDown size={13} stroke={2} />
        </RadixSelect.Icon>
      </SelectTrigger>
      <RadixSelect.Portal>
        <SelectContent position='popper' sideOffset={6}>
          <SelectViewport>
            <SelectItem value='__none__'>
              <RadixSelect.ItemText>{placeholder}</RadixSelect.ItemText>
            </SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                <RadixSelect.ItemText>{opt}</RadixSelect.ItemText>
                <CheckIcon>
                  <IconCheck size={12} stroke={2.5} />
                </CheckIcon>
              </SelectItem>
            ))}
          </SelectViewport>
        </SelectContent>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function StudioModalDialog({
  type,
  cardDraft,
  attributeDraft,
  onCardDraftChange,
  onAttributeDraftChange,
  onCardSelect,
  onSave,
  onSaveDraft,
  onDelete,
  saving,
  canDelete,
}: StudioModalDialogProps) {
  // Modify card search
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Pokédex name autocomplete (add/modify)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [autoFilledId, setAutoFilledId] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  const { suggestions } = usePokemonSearch(cardDraft.name, 8);

  // Set search
  const [setQuery, setSetQuery] = useState('');
  const [showSetDropdown, setShowSetDropdown] = useState(false);
  const setSearchRef = useRef<HTMLDivElement>(null);

  // Card Type search
  const [cardTypeQuery, setCardTypeQuery] = useState('');
  const [showCardTypeDropdown, setShowCardTypeDropdown] = useState(false);
  const cardTypeRef = useRef<HTMLDivElement>(null);

  // Rarity search
  const [rarityQuery, setRarityQuery] = useState('');
  const [showRarityDropdown, setShowRarityDropdown] = useState(false);
  const rarityRef = useRef<HTMLDivElement>(null);

  // TCG art picker
  const [artResults, setArtResults] = useState<TcgArtResult[]>([]);
  const [artLoading, setArtLoading] = useState(false);
  const [showArtPicker, setShowArtPicker] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { cards } = useGetCardsQuery();
  const { sets } = usePokemonSetsQuery();

  const filteredCards = useMemo(
    () =>
      search.trim().length === 0
        ? cards.slice(0, 8)
        : cards
            .filter((c) => c.pokemonData.name.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 8),
    [cards, search]
  );

  const setOptions = useMemo(
    () => sets.map((s) => s.name).sort(),
    [sets]
  );

  const filteredSets = useMemo(() => {
    if (!setQuery.trim()) return setOptions.slice(0, 10);
    return setOptions.filter((s) => s.toLowerCase().includes(setQuery.toLowerCase())).slice(0, 10);
  }, [setOptions, setQuery]);

  const filteredCardTypes = useMemo(() => {
    if (!cardTypeQuery.trim()) return (CARD_TYPES as readonly string[]).slice(0, 12);
    return (CARD_TYPES as readonly string[]).filter((t) => t.toLowerCase().includes(cardTypeQuery.toLowerCase()));
  }, [cardTypeQuery]);

  const filteredRarities = useMemo(() => {
    if (!rarityQuery.trim()) return (CARD_RARITIES as readonly string[]).slice(0, 12);
    return (CARD_RARITIES as readonly string[]).filter((r) => r.toLowerCase().includes(rarityQuery.toLowerCase()));
  }, [rarityQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
      if (setSearchRef.current && !setSearchRef.current.contains(e.target as Node)) setShowSetDropdown(false);
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) setShowNameSuggestions(false);
      if (cardTypeRef.current && !cardTypeRef.current.contains(e.target as Node)) setShowCardTypeDropdown(false);
      if (rarityRef.current && !rarityRef.current.contains(e.target as Node)) setShowRarityDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Intercept Escape in capture phase so open dropdowns close instead of the whole dialog
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (showSetDropdown) { e.stopPropagation(); setShowSetDropdown(false); }
      else if (showCardTypeDropdown) { e.stopPropagation(); setShowCardTypeDropdown(false); }
      else if (showRarityDropdown) { e.stopPropagation(); setShowRarityDropdown(false); }
      else if (showNameSuggestions) { e.stopPropagation(); setShowNameSuggestions(false); }
      else if (showDropdown) { e.stopPropagation(); setShowDropdown(false); }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [showSetDropdown, showCardTypeDropdown, showRarityDropdown, showNameSuggestions, showDropdown]);

  const handleSelectPokemon = async (entry: PokedexEntry) => {
    const id = `#${String(entry.id).padStart(3, '0')}`;
    // Immediate update - name + id
    onCardDraftChange({ ...cardDraft, name: entry.displayName, pokemonId: id });
    setAutoFilledId(true);
    setShowNameSuggestions(false);
    // Fetch type in background and patch it onto the LATEST draft (functional
    // update) — spreading the captured `cardDraft` here would overwrite any
    // field the user edited during the fetch.
    const detail = await fetchPokemonDetail(entry.name);
    if (detail) {
      onCardDraftChange((prev) => ({ ...prev, type: detail.primaryType }));
    }
  };

  const setCard = (key: keyof CardDraft, value: string) =>
    onCardDraftChange({ ...cardDraft, [key]: value });

  const setAttr = (key: keyof AttributeDraft, value: string) =>
    onAttributeDraftChange({ ...attributeDraft, [key]: value });

  // Fetch TCG card art
  const searchArt = async () => {
    const name = cardDraft.name.trim();
    if (!name) return;
    setArtLoading(true);
    setShowArtPicker(true);
    setArtResults([]);
    try {
      const res = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(name)}"&pageSize=20&select=id,name,number,rarity,images,set`
      );
      const json = await res.json();
      const results: TcgArtResult[] = (json.data ?? []).map((c: {
        id: string;
        name: string;
        number: string;
        rarity?: string;
        set: { name: string; total: number; releaseDate?: string };
        images: { small: string; large: string };
      }) => ({
        id: c.id,
        name: c.name,
        set: c.set.name,
        setTotal: c.set.total,
        number: c.number ?? '',
        rarity: c.rarity ?? '',
        releaseYear: c.set.releaseDate
          ? String(new Date(c.set.releaseDate).getFullYear())
          : '',
        image: c.images.large,
      }));
      setArtResults(results);
    } catch {
      setArtResults([]);
    } finally {
      setArtLoading(false);
    }
  };

  const selectArt = (result: TcgArtResult) => {
    const updated: CardDraft = {
      ...cardDraft,
      name: result.name || cardDraft.name,
      tcgId: result.id,
      tcgImageUrl: result.image,
      set: result.set || cardDraft.set,
      rarity: result.rarity || cardDraft.rarity,
      year: result.releaseYear || cardDraft.year,
      setNumber: result.number && result.setTotal
        ? `${result.number}/${result.setTotal}`
        : cardDraft.setNumber,
    };
    onCardDraftChange(updated);
    // If modifying an existing card, auto-save immediately so Collection updates
    if (cardDraft.cardId) {
      onSaveDraft(updated);
    }
    setShowArtPicker(false);
  };

  const clearArt = () => {
    onCardDraftChange({ ...cardDraft, tcgId: '', tcgImageUrl: '' });
    setShowArtPicker(false);
    setArtResults([]);
  };

  const useStockArt = () => {
    const stockUrl = `https://img.pokemondb.net/sprites/home/normal/${toSpriteName(cardDraft.name)}.png`;
    const updated: CardDraft = { ...cardDraft, tcgId: '', tcgImageUrl: stockUrl };
    onCardDraftChange(updated);
    if (cardDraft.cardId) {
      onSaveDraft(updated);
    }
    setShowArtPicker(false);
  };

  const meta: Record<string, { title: string; subtitle: string }> = {
    add: { title: 'Add Card', subtitle: 'Add a new card to your collection.' },
    modify: { title: 'Modify Card', subtitle: 'Find and update an existing card.' },
    attribute: { title: 'New Attribute', subtitle: 'Create a new set attribute.' },
  };
  const { title, subtitle } = meta[type] ?? { title: '', subtitle: '' };

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Header>
        <Title>{title}</Title>
        <Subtitle>{subtitle}</Subtitle>
      </Header>

      {/* ── Modify: card search dropdown - hidden when card is already pre-selected ── */}
      {type === 'modify' && !cardDraft.cardId && (
        <>
          <Field label='Search Card'>
            <SearchWrapper ref={searchRef}>
              <SearchIconWrap>
                <IconSearch size={15} stroke={2} />
              </SearchIconWrap>
              <SearchInput
                placeholder='Search by name...'
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
              />
              <AnimatePresence>
                {showDropdown && filteredCards.length > 0 && (
                  <Dropdown
                    key='dropdown'
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                  >
                    {filteredCards.map((card) => (
                      <DropdownItem
                        key={card.cardId}
                        onMouseDown={() => {
                          setSearch(card.pokemonData.name);
                          setShowDropdown(false);
                          onCardSelect(card);
                        }}
                      >
                        <DropdownThumb
                          src={card.attributes.tcgImageUrl ||
                            `https://img.pokemondb.net/sprites/home/normal/${toSpriteName(card.pokemonData.name)}.png`}
                          alt={card.pokemonData.name}
                        />
                        <DropdownName>{card.pokemonData.name}</DropdownName>
                        <TypeBadge>{card.pokemonData.type}</TypeBadge>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                )}
              </AnimatePresence>
            </SearchWrapper>
          </Field>
          <Divider />
        </>
      )}

      {/* ── Add / Modify: card fields ── */}
      {(type === 'add' || type === 'modify') && (
        <>
          {/* Pokémon Name - autocomplete from Pokédex */}
          <Field label='Pokémon Name'>
            <SearchWrapper ref={nameRef}>
              <SearchIconWrap>
                <IconSearch size={15} stroke={2} />
              </SearchIconWrap>
              <SearchInput
                placeholder='Search Pokédex… e.g. Charizard'
                value={cardDraft.name}
                onChange={(e) => {
                  setCard('name', e.target.value);
                  setAutoFilledId(false);
                  setShowNameSuggestions(true);
                }}
                onFocus={() => setShowNameSuggestions(true)}
                autoComplete='off'
              />
              {autoFilledId && (
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <AutoFilledBadge>auto</AutoFilledBadge>
                </span>
              )}
              <AnimatePresence>
                {showNameSuggestions && suggestions.length > 0 && (
                  <Dropdown
                    key='name-suggestions'
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                  >
                    {suggestions.map((entry) => (
                      <PokemonSuggestion
                        key={entry.id}
                        onMouseDown={() => handleSelectPokemon(entry)}
                      >
                        <PokemonSprite
                          src={entry.spriteUrl}
                          alt={entry.displayName}
                          loading='lazy'
                        />
                        <PokemonSuggestionName>{entry.displayName}</PokemonSuggestionName>
                        <PokemonSuggestionId>#{String(entry.id).padStart(3, '0')}</PokemonSuggestionId>
                      </PokemonSuggestion>
                    ))}
                  </Dropdown>
                )}
              </AnimatePresence>
            </SearchWrapper>
          </Field>

          {/* Pokédex ID - auto-filled by autocomplete, still editable */}
          <Field label='Pokédex ID'>
            <Input
              placeholder='#006'
              value={cardDraft.pokemonId}
              onChange={(e) => { setCard('pokemonId', e.target.value); setAutoFilledId(false); }}
            />
          </Field>

          {/* Type */}
          <Field label='Type'>
            <StudioSelect
              value={cardDraft.type}
              onValueChange={(v) => setCard('type', v)}
              placeholder='Select type...'
              options={POKEMON_TYPES}
            />
          </Field>

          {/* Set (searchable) */}
          <Field label='Set'>
            <SearchWrapper ref={setSearchRef}>
              <SearchIconWrap>
                <IconSearch size={15} stroke={2} />
              </SearchIconWrap>
              <SearchInput
                placeholder='Search or type set name...'
                value={cardDraft.set}
                onChange={(e) => {
                  setSetQuery(e.target.value);
                  setCard('set', e.target.value);
                  setShowSetDropdown(true);
                }}
                onFocus={() => setShowSetDropdown(true)}
              />
              <AnimatePresence>
                {showSetDropdown && filteredSets.length > 0 && (
                  <Dropdown
                    key='set-dropdown'
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                  >
                    {filteredSets.map((s) => (
                      <SetDropdownItem
                        key={s}
                        onMouseDown={() => {
                          const tcgSet = sets.find((ts) => ts.name === s);
                          const year = tcgSet?.releaseDate
                            ? String(new Date(tcgSet.releaseDate).getFullYear())
                            : '';
                          const existingNum = cardDraft.setNumber.split('/')[0].trim();
                          const newSetNumber = tcgSet?.total
                            ? existingNum ? `${existingNum}/${tcgSet.total}` : `/${tcgSet.total}`
                            : cardDraft.setNumber;
                          onCardDraftChange({
                            ...cardDraft,
                            set: s,
                            year: year || cardDraft.year,
                            setNumber: newSetNumber,
                          });
                          setSetQuery(s);
                          setShowSetDropdown(false);
                        }}
                      >
                        {s}
                      </SetDropdownItem>
                    ))}
                  </Dropdown>
                )}
              </AnimatePresence>
            </SearchWrapper>
          </Field>

          {/* Card Type + Rarity - searchable */}
          <Row>
            <Field label='Card Type'>
              <SearchWrapper ref={cardTypeRef}>
                <SearchIconWrap><IconSearch size={15} stroke={2} /></SearchIconWrap>
                <SearchInput
                  placeholder='e.g. Basic, GX, V...'
                  value={cardDraft.cardType}
                  onChange={(e) => { setCardTypeQuery(e.target.value); setCard('cardType', e.target.value); setShowCardTypeDropdown(true); }}
                  onFocus={() => setShowCardTypeDropdown(true)}
                  autoComplete='off'
                />
                <AnimatePresence>
                  {showCardTypeDropdown && filteredCardTypes.length > 0 && (
                    <Dropdown
                      key='cardtype-dropdown'
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                    >
                      {filteredCardTypes.map((t) => (
                        <SetDropdownItem
                          key={t}
                          onMouseDown={() => { setCard('cardType', t); setCardTypeQuery(''); setShowCardTypeDropdown(false); }}
                        >
                          {t}
                        </SetDropdownItem>
                      ))}
                    </Dropdown>
                  )}
                </AnimatePresence>
              </SearchWrapper>
            </Field>
            <Field label='Rarity'>
              <SearchWrapper ref={rarityRef}>
                <SearchIconWrap><IconSearch size={15} stroke={2} /></SearchIconWrap>
                <SearchInput
                  placeholder='e.g. Holo Rare, IR...'
                  value={cardDraft.rarity}
                  onChange={(e) => { setRarityQuery(e.target.value); setCard('rarity', e.target.value); setShowRarityDropdown(true); }}
                  onFocus={() => setShowRarityDropdown(true)}
                  autoComplete='off'
                />
                <AnimatePresence>
                  {showRarityDropdown && filteredRarities.length > 0 && (
                    <Dropdown
                      key='rarity-dropdown'
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                    >
                      {filteredRarities.map((r) => (
                        <SetDropdownItem
                          key={r}
                          onMouseDown={() => { setCard('rarity', r); setRarityQuery(''); setShowRarityDropdown(false); }}
                        >
                          {r}
                        </SetDropdownItem>
                      ))}
                    </Dropdown>
                  )}
                </AnimatePresence>
              </SearchWrapper>
            </Field>
          </Row>

          {/* Collection status (Owned vs Wishlist) */}
          <Field label='Status'>
            <VariantToggleRow>
              <VariantToggle
                type='button'
                $active={(cardDraft.status ?? 'owned') === 'owned'}
                onClick={() => onCardDraftChange({ ...cardDraft, status: 'owned' })}
              >
                Owned
              </VariantToggle>
              <VariantToggle
                type='button'
                $active={cardDraft.status === 'wishlist'}
                onClick={() => onCardDraftChange({ ...cardDraft, status: 'wishlist' })}
              >
                Wishlist
              </VariantToggle>
            </VariantToggleRow>
          </Field>

          {/* Print variants */}
          <Field label='Print Variants'>
            <VariantToggleRow>
              <VariantToggle
                type='button'
                $active={cardDraft.hasNormal}
                onClick={() => onCardDraftChange({ ...cardDraft, hasNormal: !cardDraft.hasNormal })}
              >
                Normal
              </VariantToggle>
              <VariantToggle
                type='button'
                $active={cardDraft.hasReverseHolo}
                onClick={() => onCardDraftChange({ ...cardDraft, hasReverseHolo: !cardDraft.hasReverseHolo })}
              >
                Rev. Holo
              </VariantToggle>
            </VariantToggleRow>
          </Field>

          {/* Condition */}
          <Field label='Condition'>
            <StudioSelect
              value={cardDraft.condition}
              onValueChange={(v) => setCard('condition', v)}
              placeholder='Select condition...'
              options={CARD_CONDITIONS}
            />
          </Field>

          {/* Year + Set Number + Grading */}
          <Row>
            <Field label='Year'>
              <Input
                type='number'
                placeholder='1999'
                value={cardDraft.year}
                onChange={(e) => setCard('year', e.target.value)}
              />
            </Field>
            <Field label='Set Number'>
              <Input
                placeholder='4/102'
                value={cardDraft.setNumber}
                onChange={(e) => setCard('setNumber', e.target.value)}
              />
            </Field>
          </Row>

          <Field label='Grading (optional)'>
            <Input
              type='number'
              placeholder='PSA / BGS grade (1–10)'
              min={1}
              max={10}
              value={cardDraft.grading}
              onChange={(e) => setCard('grading', e.target.value)}
            />
          </Field>

          <Field label='Quantity'>
            <QuantityStepper>
              <StepBtn
                type='button'
                disabled={cardDraft.quantity <= 1}
                onClick={() => onCardDraftChange({ ...cardDraft, quantity: Math.max(1, cardDraft.quantity - 1) })}
              >
                −
              </StepBtn>
              <QtyDisplay>{cardDraft.quantity}</QtyDisplay>
              <StepBtn
                type='button'
                onClick={() => onCardDraftChange({ ...cardDraft, quantity: cardDraft.quantity + 1 })}
              >
                +
              </StepBtn>
            </QuantityStepper>
          </Field>

          {/* TCG Card Art Picker */}
          <ArtSection>
            <ArtSectionHeader>
              <FieldLabel>Card Artwork</FieldLabel>
              <ArtSearchButton
                type='button'
                whileTap={cardDraft.name.trim() ? { scale: 0.95 } : {}}
                onClick={cardDraft.name.trim() ? searchArt : undefined}
                style={{ opacity: cardDraft.name.trim() ? 1 : 0.45, cursor: cardDraft.name.trim() ? 'pointer' : 'default' }}
              >
                <IconSparkles size={12} stroke={2} />
                {cardDraft.name.trim() ? `Find art for ${cardDraft.name}` : 'Enter a name first'}
              </ArtSearchButton>
            </ArtSectionHeader>

            {/* Selected art preview */}
            {cardDraft.tcgImageUrl && !showArtPicker && (
              <ArtSelectedPreview>
                <ArtPreviewImg src={cardDraft.tcgImageUrl} alt='Selected card art' />
                <ArtPreviewText>
                  <ArtPreviewName>Card art selected</ArtPreviewName>
                  <ArtPreviewSet>{cardDraft.tcgId}</ArtPreviewSet>
                </ArtPreviewText>
                <ClearArtButton type='button' className='icon-close' onClick={clearArt} aria-label='Clear art'>
                  <IconX size={14} stroke={2} />
                </ClearArtButton>
              </ArtSelectedPreview>
            )}

            {/* Art picker grid */}
            <AnimatePresence>
              {showArtPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {artLoading ? (
                    <ArtLoading>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        ✦
                      </motion.span>
                      Searching TCG database…
                    </ArtLoading>
                  ) : artResults.length === 0 ? (
                    <ArtLoading>
                      <span>No cards found.</span>
                      <StockArtButton type='button' onClick={useStockArt}>
                        Use stock art
                      </StockArtButton>
                    </ArtLoading>
                  ) : (
                    <ArtGrid
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {artResults.map((result, i) => (
                        <ArtCard
                          key={result.id}
                          type='button'
                          $selected={cardDraft.tcgImageUrl === result.image}
                          onClick={() => selectArt(result)}
                          whileHover={{ y: -2 }}
                          whileTap={tapPress}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          title={`${result.name} - ${result.set}`}
                        >
                          <ArtImg src={result.image} alt={result.name} loading='lazy' />
                          {cardDraft.tcgImageUrl === result.image && (
                            <ArtSelectedBadge>
                              <svg width='8' height='8' viewBox='0 0 10 8' fill='none'>
                                <path d='M1 4L3.5 6.5L9 1' stroke='white' strokeWidth='1.8' strokeLinecap='round' />
                              </svg>
                            </ArtSelectedBadge>
                          )}
                        </ArtCard>
                      ))}
                    </ArtGrid>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </ArtSection>
        </>
      )}

      {/* ── Attribute fields ── */}
      {type === 'attribute' && (
        <>
          <Field label='Set Name'>
            <Input
              placeholder='e.g. Base Set'
              value={attributeDraft.name}
              onChange={(e) => setAttr('name', e.target.value)}
            />
          </Field>
          <Row>
            <Field label='Year'>
              <Input
                type='number'
                placeholder='1999'
                value={attributeDraft.year}
                onChange={(e) => setAttr('year', e.target.value)}
              />
            </Field>
            <Field label='Total Cards'>
              <Input
                type='number'
                placeholder='102'
                value={attributeDraft.totalCards}
                onChange={(e) => setAttr('totalCards', e.target.value)}
              />
            </Field>
          </Row>
        </>
      )}

      {/* ── Footer ── */}
      <Footer>
        <Button
          buttonType='primary'
          type='button'
          onClick={onSave}
          disabled={saving}
          style={{ width: '100%' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>

        {canDelete && !showDeleteConfirm && (
          <DeleteButton type='button' onClick={() => setShowDeleteConfirm(true)}>
            <IconTrash size={14} stroke={2} />
            Delete card
          </DeleteButton>
        )}

        <AnimatePresence>
          {showDeleteConfirm && (
            <DeleteSection
              key='delete-confirm'
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
            >
              <DeleteWarning>
                <IconAlertTriangle size={16} stroke={2} />
                This will permanently delete the card.
              </DeleteWarning>
              <DeleteActions>
                <CancelButton type='button' onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </CancelButton>
                <ConfirmDeleteButton type='button' onClick={onDelete}>
                  Delete
                </ConfirmDeleteButton>
              </DeleteActions>
            </DeleteSection>
          )}
        </AnimatePresence>
      </Footer>
    </Form>
  );
}
