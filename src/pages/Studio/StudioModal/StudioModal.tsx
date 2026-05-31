import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { IconCheck, IconX, IconAlertTriangle, IconPlus } from '@tabler/icons-react';
import { tapPress } from '../../../theme/motion';
import { toSpriteName } from '../../../utils';
import { Modal } from '../../../components';
import { CardModel } from '../../../api/fetch/card/cardModel';
import { saveCard, saveAttribute, removeCard, generateCardId } from '../../../api/mutations';
import { useGetCardsQuery } from '../../../api';
import { StudioModalDialog } from './StudioModalDialog';
import { StudioModalCanvas } from './StudioModalCanvas';

// ── Shared draft types ────────────────────────────────────────────────────────

export interface CardDraft {
  cardId: string;
  name: string;
  pokemonId: string;
  type: string;
  set: string;
  cardType: string;
  rarity: string;
  condition: string;
  year: string;
  setNumber: string;
  grading: string;
  quantity: number;
  tcgId: string;
  tcgImageUrl: string;
  hasNormal: boolean;
  hasReverseHolo: boolean;
  status: 'owned' | 'wishlist';
}

export interface AttributeDraft {
  name: string;
  year: string;
  totalCards: string;
}

export const emptyCardDraft: CardDraft = {
  cardId: '', name: '', pokemonId: '', type: '',
  set: '', cardType: '', rarity: '', condition: '',
  year: '', setNumber: '', grading: '', quantity: 1,
  tcgId: '', tcgImageUrl: '',
  hasNormal: true, hasReverseHolo: false,
  status: 'owned',
};

export const emptyAttributeDraft: AttributeDraft = { name: '', year: '', totalCards: '' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function draftToCard(draft: CardDraft, existing?: CardModel): CardModel {
  const cardId = draft.cardId || generateCardId();
  return {
    cardId,
    status: draft.status ?? existing?.status ?? 'owned',
    quantity: draft.quantity ?? existing?.quantity ?? 1,
    setNumber: Number(draft.setNumber.split('/')[0]) || 0,
    attributes: {
      cardType: draft.cardType,
      set: draft.set,
      rarity: draft.rarity || existing?.attributes?.rarity || '',
      condition: draft.condition,
      grading: Number(draft.grading) || 0,
      year: Number(draft.year) || undefined,
      isGraded: !!draft.grading,
      tcgId: draft.tcgId || existing?.attributes?.tcgId || '',
      tcgImageUrl: draft.tcgImageUrl || existing?.attributes?.tcgImageUrl || '',
      variants: { normal: draft.hasNormal, alternate: draft.hasReverseHolo },
    },
    pokemonData: {
      name: draft.name,
      id: Number(draft.pokemonId.replace(/\D/g, '')) || 0,
      evolutions: existing?.pokemonData?.evolutions ?? { first: { name: '', imageUrl: '' } },
      type: draft.type,
      imageUrl: draft.tcgImageUrl ||
        existing?.pokemonData?.imageUrl ||
        `https://img.pokemondb.net/sprites/home/normal/${toSpriteName(draft.name)}.png`,
    },
  };
}

export function cardToDraft(card: CardModel): CardDraft {
  return {
    cardId: card.cardId,
    status: card.status ?? 'owned',
    name: card.pokemonData.name,
    pokemonId: `#${String(card.pokemonData.id).padStart(3, '0')}`,
    type: card.pokemonData.type,
    set: card.attributes.set,
    cardType: card.attributes.cardType,
    rarity: card.attributes.rarity ?? '',
    condition: card.attributes.condition,
    year: String(card.attributes.year ?? ''),
    setNumber: String(card.setNumber),
    grading: card.attributes.grading ? String(card.attributes.grading) : '',
    quantity: card.quantity ?? 1,
    tcgId: card.attributes.tcgId ?? '',
    tcgImageUrl: card.attributes.tcgImageUrl ?? '',
    hasNormal: card.attributes.variants?.normal ?? true,
    // Read the canonical `alternate` key first (what draftToCard writes); fall
    // back to the legacy `reverseHolo` key for older records. Reading only the
    // legacy key silently dropped the flag on every Modify round-trip.
    hasReverseHolo: card.attributes.variants?.alternate ?? card.attributes.variants?.reverseHolo ?? false,
  };
}

// ── Styled components ─────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.space[4]} ${theme.space[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.surface.muted};
  flex-shrink: 0;
`;

const ActionLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.color.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.07em;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text.secondary};
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radius.md};
  transition: background-color ${({ theme }) => theme.transition.fast},
    color ${({ theme }) => theme.transition.fast};

  &:hover {
    background: ${({ theme }) => theme.color.text.primaryHover};
    color: ${({ theme }) => theme.color.text.primary};
  }
`;

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
`;

const DialogPane = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: ${({ theme }) => theme.space[5]};
  overflow-y: auto;
  min-width: 0;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.color.surface.muted} transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.surface.muted};
    border-radius: 4px;
  }
`;

const CanvasPane = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  background: ${({ theme }) => theme.color.surface.muted};
  border-left: 1px solid ${({ theme }) => theme.color.surface.muted};
  overflow: hidden;
  min-width: 0;

  @media (max-width: ${({ theme }) => theme.breakpoint.md}) {
    display: none;
  }
`;

// ── Duplicate warning overlay ─────────────────────────────────────────────────

const DuplicateOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[6]};
  gap: ${({ theme }) => theme.space[4]};
  background: ${({ theme }) => theme.color.surface.subtle};
  z-index: 20;
  text-align: center;
`;

const WarnRing = styled(motion.div)`
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  background: ${({ theme }) => `${theme.color.aurora.yellow}1a`};
  border: 2px solid ${({ theme }) => `${theme.color.aurora.yellow}55`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.aurora.yellow};
`;

const DupTitle = styled.p`
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.color.text.primary};
  margin: 0;
`;

const DupSubtext = styled.p`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.secondary};
  margin: 0;
  max-width: 22rem;
  line-height: 1.5;
`;

const DupActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[2]};
  flex-wrap: wrap;
  justify-content: center;
`;

const DupBtnPrimary = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.frost.blue};
  color: #fff;
  border: none;
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-family: inherit;
  cursor: pointer;
  &:hover { filter: brightness(1.1); }
`;

const DupBtnSecondary = styled(motion.button)`
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
  border-radius: ${({ theme }) => theme.radius.full};
  background: transparent;
  color: ${({ theme }) => theme.color.text.secondary};
  border: 1.5px solid ${({ theme }) => theme.color.surface.border};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  font-family: inherit;
  cursor: pointer;
  &:hover { border-color: ${({ theme }) => theme.color.frost.blue}; color: ${({ theme }) => theme.color.frost.blue}; }
`;

// ── Success overlay ───────────────────────────────────────────────────────────

const SuccessOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[4]};
  background: ${({ theme }) => theme.color.surface.subtle};
  z-index: 20;
`;

const CheckRing = styled(motion.div)`
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: ${({ theme }) => `${theme.color.aurora.green}18`};
  border: 2px solid ${({ theme }) => `${theme.color.aurora.green}40`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.aurora.green};
`;

const SuccessMessage = styled(motion.p)`
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.color.text.primary};
  margin: 0;
`;

const SuccessSubtext = styled(motion.p)`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.secondary};
  margin: 0;
`;

// ── Action labels ─────────────────────────────────────────────────────────────

const headerLabels: Record<string, string> = {
  add: 'Add Card',
  modify: 'Modify Card',
  attribute: 'New Attribute',
};

const successLabels: Record<string, [string, string]> = {
  add: ['Card added!', 'Your card has been saved to the collection.'],
  modify: ['Card updated!', 'Your changes have been saved.'],
  attribute: ['Attribute created!', 'The new set has been added.'],
  delete: ['Card deleted!', 'The card has been removed.'],
};

// ── Main component ────────────────────────────────────────────────────────────

interface StudioModalProps {
  isOpen: boolean;
  actionType: string;
  onClose: () => void;
  preselectedCard?: CardModel | null;
  prefilledDraft?: Partial<CardDraft>;
}

export function StudioModal({ isOpen, onClose, actionType, preselectedCard, prefilledDraft }: StudioModalProps) {
  const [cardDraft, setCardDraft] = useState<CardDraft>(
    preselectedCard
      ? cardToDraft(preselectedCard)
      : prefilledDraft
      ? { ...emptyCardDraft, ...prefilledDraft }
      : emptyCardDraft
  );
  const [attributeDraft, setAttributeDraft] = useState<AttributeDraft>(emptyAttributeDraft);
  const [selectedCard, setSelectedCard] = useState<CardModel | null>(preselectedCard ?? null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'delete-success' | 'error'>('idle');
  const [duplicateMatch, setDuplicateMatch] = useState<CardModel | null>(null);
  const [pendingDraft, setPendingDraft] = useState<CardDraft | null>(null);
  const { cards: existingCards } = useGetCardsQuery();

  // Find a duplicate for an add action (ignores the currently-selected card when modifying)
  const findDuplicate = (draft: CardDraft): CardModel | null => {
    const name = draft.name.trim().toLowerCase();
    if (!name) return null;
    const set = draft.set.trim().toLowerCase();
    const tcgId = draft.tcgId.trim();
    for (const c of existingCards) {
      if (selectedCard && c.cardId === selectedCard.cardId) continue;
      // Strongest match: same tcgId
      if (tcgId && c.attributes.tcgId === tcgId) return c;
      // Fallback: name + set + setNumber
      if (
        c.pokemonData.name.toLowerCase() === name &&
        c.attributes.set.toLowerCase() === set &&
        String(c.setNumber) === draft.setNumber.split('/')[0]
      ) return c;
    }
    return null;
  };

  // Sync draft when a preselected card is passed (e.g. clicking a card in Studio grid)
  useEffect(() => {
    if (preselectedCard) {
      setSelectedCard(preselectedCard);
      setCardDraft(cardToDraft(preselectedCard));
    }
  }, [preselectedCard]);

  const handleCardSelect = (card: CardModel) => {
    setSelectedCard(card);
    setCardDraft(cardToDraft(card));
  };

  const performSave = async (draft: CardDraft) => {
    setSaveStatus('saving');
    try {
      const ok = await saveCard(draftToCard(draft, selectedCard ?? undefined));
      // Blocked by read-only mode — a toast already fired; don't fake success.
      if (!ok) { setSaveStatus('idle'); return; }
      setSaveStatus('success');
      setTimeout(() => { setSaveStatus('idle'); handleClose(); }, 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleSave = async () => {
    if (actionType === 'attribute') {
      setSaveStatus('saving');
      try {
        const ok = await saveAttribute({
          id: `attr_${Date.now()}`,
          name: attributeDraft.name,
          type: 'set',
          meta: {
            year: Number(attributeDraft.year) || undefined,
            totalCards: Number(attributeDraft.totalCards) || undefined,
          },
        });
        if (!ok) { setSaveStatus('idle'); return; }
        setSaveStatus('success');
        setTimeout(() => { setSaveStatus('idle'); handleClose(); }, 2000);
      } catch {
        setSaveStatus('error');
      }
      return;
    }

    // For 'add', check for duplicates first
    if (actionType === 'add') {
      const match = findDuplicate(cardDraft);
      if (match) {
        setDuplicateMatch(match);
        setPendingDraft(cardDraft);
        return;
      }
    }
    performSave(cardDraft);
  };

  const handleSaveDraft = async (draft: CardDraft) => {
    if (actionType === 'add') {
      const match = findDuplicate(draft);
      if (match) {
        setDuplicateMatch(match);
        setPendingDraft(draft);
        return;
      }
    }
    performSave(draft);
  };

  const resolveIncrement = async () => {
    if (!duplicateMatch) return;
    // If the pending draft is for an owned card but the existing record is
    // wishlist-only, promote it — don't leave it as wanted.
    const incomingStatus = pendingDraft?.status ?? 'owned';
    const nextStatus: 'owned' | 'wishlist' =
      duplicateMatch.status === 'wishlist' && incomingStatus === 'owned'
        ? 'owned'
        : duplicateMatch.status ?? 'owned';
    const bumped: CardModel = {
      ...duplicateMatch,
      status: nextStatus,
      // Wishlist entries start at qty 1; don't "double" when promoting
      quantity: duplicateMatch.status === 'wishlist' && incomingStatus === 'owned'
        ? (pendingDraft?.quantity ?? 1)
        : (duplicateMatch.quantity ?? 1) + (pendingDraft?.quantity ?? 1),
    };
    setDuplicateMatch(null);
    setPendingDraft(null);
    setSaveStatus('saving');
    try {
      const ok = await saveCard(bumped);
      if (!ok) { setSaveStatus('idle'); return; }
      setSaveStatus('success');
      setTimeout(() => { setSaveStatus('idle'); handleClose(); }, 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  const resolveAddAnyway = async () => {
    const draft = pendingDraft;
    setDuplicateMatch(null);
    setPendingDraft(null);
    if (draft) await performSave(draft);
  };

  const resolveCancel = () => {
    setDuplicateMatch(null);
    setPendingDraft(null);
  };

  const handleDelete = async () => {
    if (!selectedCard?.cardId) return;
    setSaveStatus('saving');
    try {
      await removeCard(selectedCard.cardId);
      setSaveStatus('delete-success');
      setTimeout(() => { setSaveStatus('idle'); handleClose(); }, 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleClose = () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('idle');
    setCardDraft(emptyCardDraft);
    setAttributeDraft(emptyAttributeDraft);
    setSelectedCard(null);
    onClose();
  };

  const [successTitle, successSub] = successLabels[
    saveStatus === 'delete-success' ? 'delete' : actionType
  ] ?? ['Saved!', ''];

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Container>
        <ModalHeader>
          <ActionLabel>{headerLabels[actionType] ?? 'Studio'}</ActionLabel>
          <CloseButton className='icon-close' onClick={handleClose} aria-label='Close'>
            <IconX size={16} stroke={2} />
          </CloseButton>
        </ModalHeader>

        <ContentContainer>
          <DialogPane>
            <StudioModalDialog
              type={actionType}
              cardDraft={cardDraft}
              attributeDraft={attributeDraft}
              onCardDraftChange={setCardDraft}
              onAttributeDraftChange={setAttributeDraft}
              onCardSelect={handleCardSelect}
              onSave={handleSave}
              onSaveDraft={handleSaveDraft}
              onDelete={handleDelete}
              saving={saveStatus === 'saving'}
              canDelete={actionType === 'modify' && !!selectedCard}
            />
          </DialogPane>
          <CanvasPane>
            <StudioModalCanvas type={actionType} cardDraft={cardDraft} />
          </CanvasPane>
        </ContentContainer>

        {/* ── Duplicate warning overlay ── */}
        <AnimatePresence>
          {duplicateMatch && (
            <DuplicateOverlay
              key='duplicate'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <WarnRing
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.05 }}
              >
                <IconAlertTriangle size={32} stroke={2.5} />
              </WarnRing>
              <DupTitle>
                {duplicateMatch.status === 'wishlist' ? 'Already on your wishlist' : 'Duplicate card detected'}
              </DupTitle>
              <DupSubtext>
                {duplicateMatch.status === 'wishlist' ? (
                  <>
                    <strong>{duplicateMatch.pokemonData.name}</strong>
                    {duplicateMatch.attributes.set ? <> from <strong>{duplicateMatch.attributes.set}</strong></> : null}
                    {' '}is on your wishlist. Moving it to your collection will mark it as owned.
                  </>
                ) : (
                  <>
                    You already own <strong>{duplicateMatch.pokemonData.name}</strong>
                    {duplicateMatch.attributes.set ? <> from <strong>{duplicateMatch.attributes.set}</strong></> : null}
                    {' '}(×{duplicateMatch.quantity ?? 1}). Increment the quantity, or add this as a separate copy.
                  </>
                )}
              </DupSubtext>
              <DupActions>
                <DupBtnPrimary
                  onClick={resolveIncrement}
                  whileTap={tapPress}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                >
                  <IconPlus size={14} stroke={2.5} />
                  {duplicateMatch.status === 'wishlist'
                    ? 'Move to collection'
                    : `Increment to ×${(duplicateMatch.quantity ?? 1) + (pendingDraft?.quantity ?? 1)}`}
                </DupBtnPrimary>
                <DupBtnSecondary
                  onClick={resolveAddAnyway}
                  whileTap={tapPress}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                >
                  Add as new
                </DupBtnSecondary>
                <DupBtnSecondary
                  onClick={resolveCancel}
                  whileTap={tapPress}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                >
                  Cancel
                </DupBtnSecondary>
              </DupActions>
            </DuplicateOverlay>
          )}
        </AnimatePresence>

        {/* ── Success overlay ── */}
        <AnimatePresence>
          {(saveStatus === 'success' || saveStatus === 'delete-success') && (
            <SuccessOverlay
              key='success'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CheckRing
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.05 }}
              >
                <IconCheck size={36} stroke={2.5} />
              </CheckRing>
              <SuccessMessage
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {successTitle}
              </SuccessMessage>
              <SuccessSubtext
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                {successSub}
              </SuccessSubtext>
            </SuccessOverlay>
          )}
        </AnimatePresence>
      </Container>
    </Modal>
  );
}
