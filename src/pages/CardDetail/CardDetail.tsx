import styled from 'styled-components';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  IconArrowLeft,
  IconCheck,
  IconHeartFilled,
  IconPhotoScan,
  IconTrash,
} from '@tabler/icons-react';
import { SectionWrapper } from '../Home/sections/sectionStyles';
import { useGetCardsQuery } from '../../api';
import { removeCard, saveCard } from '../../api/mutations';
import { useTcgArtLookup } from '../../api/tcg/useTcgArtLookup';
import { useTcgPrices } from '../../api/tcg/useTcgPrices';
import { CardModel } from '../../api/fetch/card/cardModel';
import { useAudRate } from '../../hooks/useAudRate';
import { fmtPrice, useCurrency } from '../../hooks/useCurrency';
import { useToast } from '../../providers/ToastProvider';
import { useReadOnly } from '../../providers/ReadOnlyProvider';
import { tapPress, easeOut } from '../../theme/motion';

const Main = styled.main`
  background-color: ${({ theme }) => theme.color.surface.muted};
  min-height: 60dvh;
  padding-bottom: ${({ theme }) => theme.space[10]};
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  margin: ${({ theme }) => `${theme.space[5]} 0 ${theme.space[4]}`};
  color: ${({ theme }) => theme.color.text.secondary};
  text-decoration: none;
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  border-radius: ${({ theme }) => theme.radius.md};
  transition: color ${({ theme }) => theme.transition.fast},
    background-color ${({ theme }) => theme.transition.fast};

  &:hover {
    color: ${({ theme }) => theme.color.text.primary};
    background: ${({ theme }) => theme.color.surface.subtle};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space[6]};
  align-items: start;

  @media (min-width: ${({ theme }) => theme.breakpoint.md}) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: ${({ theme }) => theme.space[8]};
  }
`;

const ArtWrap = styled(motion.div)`
  position: relative;
  aspect-ratio: 2.5 / 3.5;
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  background: ${({ theme }) => theme.color.surface.subtle};
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  max-width: 26rem;
  justify-self: center;
  width: 100%;
`;

const ArtImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const ArtPlaceholder = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.text.tertiary};
`;

const Panel = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[5]};
`;

const NameRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[3]};
  flex-wrap: wrap;
`;

const Name = styled.h1`
  font-size: ${({ theme }) => theme.typography.size.xxl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.color.text.primary};
  margin: 0;
  text-transform: capitalize;
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

const WishlistPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
  background: ${({ theme }) => theme.color.aurora.red}1f;
  color: ${({ theme }) => theme.color.aurora.red};
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Price = styled.div`
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.color.frost.teal};
`;

const PriceMissing = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.tertiary};
  font-style: italic;
`;

const Attributes = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: ${({ theme }) => theme.space[4]};
  margin: 0;
  padding: ${({ theme }) => theme.space[4]};
  background: ${({ theme }) => theme.color.surface.subtle};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.surface.border};
`;

const AttrBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const AttrLabel = styled.dt`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
`;

const AttrValue = styled.dd`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  margin: 0;
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NotesWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const NotesLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
`;

const NotesArea = styled.textarea`
  min-height: 6rem;
  padding: ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.surface.border};
  background: ${({ theme }) => theme.color.surface.base};
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.typography.family.primary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  line-height: 1.5;
  resize: vertical;
  transition: border-color ${({ theme }) => theme.transition.fast};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.frost.sky};
  }

  &::placeholder {
    color: ${({ theme }) => theme.color.text.tertiary};
  }
`;

const NotesStatus = styled.span<{ $state: 'idle' | 'saving' | 'saved' }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme, $state }) =>
    $state === 'saved' ? theme.color.aurora.green : theme.color.text.tertiary};
  min-height: 1em;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.space[2]};
`;

const DangerBtn = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.aurora.red}55;
  background: ${({ theme }) => theme.color.aurora.red}14;
  color: ${({ theme }) => theme.color.aurora.red};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transition.fast};

  &:hover {
    background: ${({ theme }) => theme.color.aurora.red}22;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RelatedHeader = styled.h2`
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.color.text.primary};
  margin: ${({ theme }) => `${theme.space[10]} 0 ${theme.space[4]}`};
`;

const RelatedStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
  gap: ${({ theme }) => theme.space[4]};
`;

const RelatedCardLink = styled(Link)`
  display: block;
  text-decoration: none;
  aspect-ratio: 2.5 / 3.5;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  background: ${({ theme }) => theme.color.surface.subtle};
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  position: relative;
  transition: transform ${({ theme }) => theme.transition.fast};

  &:hover {
    transform: translateY(-3px);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const RelatedName = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
  color: #fff;
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NotFoundState = styled.div`
  padding: ${({ theme }) => `${theme.space[16]} ${theme.space[4]}`};
  text-align: center;
  color: ${({ theme }) => theme.color.text.secondary};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
`;

function formatVariantLabel(card: CardModel): string {
  const v = card.attributes.variants;
  if (!v) return 'Normal';
  const parts: string[] = [];
  if (v.normal) parts.push('Normal');
  if (v.alternate ?? v.reverseHolo) parts.push('Alternate');
  return parts.length ? parts.join(' + ') : 'Normal';
}

export function CardDetail() {
  const { cardId = '' } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { cards, loading } = useGetCardsQuery();
  const audRate = useAudRate();
  const { currency } = useCurrency();
  const { toast } = useToast();
  const { isReadOnly } = useReadOnly();

  const card = useMemo(() => cards.find((c) => c.cardId === cardId), [cards, cardId]);

  // Related cards from the same set, excluding this card, capped at 12.
  const related = useMemo(() => {
    if (!card) return [] as CardModel[];
    return cards
      .filter((c) => c.cardId !== card.cardId && c.attributes.set === card.attributes.set)
      .slice(0, 12);
  }, [cards, card]);

  const tcgIds = useMemo(() => {
    const ids: string[] = [];
    if (card?.attributes.tcgId) ids.push(card.attributes.tcgId);
    for (const c of related) if (c.attributes.tcgId) ids.push(c.attributes.tcgId);
    return ids;
  }, [card, related]);
  const { priceMap } = useTcgPrices(tcgIds);

  const nameList = useMemo(() => {
    const names: string[] = [];
    if (card) names.push(card.pokemonData.name);
    for (const c of related) names.push(c.pokemonData.name);
    return names;
  }, [card, related]);
  const { artMap } = useTcgArtLookup(nameList, Boolean(card));

  const getImg = useCallback(
    (c: CardModel) =>
      c.attributes.tcgImageUrl || artMap[c.pokemonData.name.toLowerCase()] || null,
    [artMap],
  );

  // ── Notes editor ──────────────────────────────────────────────────────────
  const [notesDraft, setNotesDraft] = useState('');
  const [notesState, setNotesState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savedTimer = useRef<number | undefined>(undefined);
  const debounceTimer = useRef<number | undefined>(undefined);
  const lastSavedRef = useRef<string>('');

  // Hydrate notes from the card whenever the card (or its notes) changes.
  // Narrow to the two fields we care about so re-rendering the parent on any
  // snapshot doesn't blow away the user's in-flight edit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!card) return;
    const next = card.notes ?? '';
    // If the incoming value equals what we last saved, this snapshot is our own
    // write echoing back — don't reset the draft, or we'd wipe characters the
    // user typed during the save round-trip. Only hydrate on external changes
    // (initial load, card switch, edit from another device).
    if (next === lastSavedRef.current) return;
    setNotesDraft(next);
    lastSavedRef.current = next;
  }, [card?.cardId, card?.notes]);

  useEffect(() => () => {
    window.clearTimeout(debounceTimer.current);
    window.clearTimeout(savedTimer.current);
  }, []);

  const scheduleSave = useCallback(
    (next: string) => {
      if (!card) return;
      if (isReadOnly) return;
      window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(async () => {
        if (next === lastSavedRef.current) return;
        setNotesState('saving');
        try {
          await saveCard({ ...card, notes: next || undefined });
          lastSavedRef.current = next;
          setNotesState('saved');
          window.clearTimeout(savedTimer.current);
          savedTimer.current = window.setTimeout(() => setNotesState('idle'), 1800);
        } catch {
          setNotesState('idle');
          toast({ message: 'Couldn’t save notes', tone: 'error' });
        }
      }, 600);
    },
    [card, isReadOnly, toast],
  );

  const onNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setNotesDraft(next);
    scheduleSave(next);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false);
  const handleDelete = useCallback(async () => {
    if (!card) return;
    if (isReadOnly) {
      toast({ message: 'Read-only mode is on', tone: 'info' });
      return;
    }
    const ok = window.confirm(`Remove ${card.pokemonData.name} from your collection?`);
    if (!ok) return;
    setDeleting(true);
    try {
      await removeCard(card.cardId);
      toast({ message: `${card.pokemonData.name} removed`, tone: 'success' });
      navigate('/collections');
    } catch {
      toast({ message: 'Couldn’t remove card', tone: 'error' });
      setDeleting(false);
    }
  }, [card, isReadOnly, toast, navigate]);

  if (loading && !card) {
    return (
      <Main>
        <SectionWrapper>
          <BackLink to='/collections'>
            <IconArrowLeft size={16} stroke={2} /> Back to collection
          </BackLink>
          <NotFoundState>Loading…</NotFoundState>
        </SectionWrapper>
      </Main>
    );
  }

  if (!card) {
    return (
      <Main>
        <SectionWrapper>
          <BackLink to='/collections'>
            <IconArrowLeft size={16} stroke={2} /> Back to collection
          </BackLink>
          <NotFoundState>
            <IconPhotoScan size={48} stroke={1.2} />
            <div>We couldn’t find that card in your collection.</div>
          </NotFoundState>
        </SectionWrapper>
      </Main>
    );
  }

  const imgUrl = getImg(card);
  const priceUsd = card.attributes.tcgId ? priceMap.get(card.attributes.tcgId) : undefined;
  const isGraded = card.attributes.isGraded || (card.attributes.grading ?? 0) > 0;
  const status = card.status ?? 'owned';

  return (
    <Main>
      <SectionWrapper>
        <BackLink to='/collections' className='icon-arr-l'>
          <IconArrowLeft size={16} stroke={2} /> Back to collection
        </BackLink>

        <Grid>
          <ArtWrap
            layoutId={`card-art-${card.cardId}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: easeOut }}
          >
            {imgUrl ? (
              <ArtImg src={imgUrl} alt={card.pokemonData.name} />
            ) : (
              <ArtPlaceholder>
                <IconPhotoScan size='40%' stroke={1} />
              </ArtPlaceholder>
            )}
          </ArtWrap>

          <Panel
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: easeOut }}
          >
            <div>
              <NameRow>
                <Name>{card.pokemonData.name}</Name>
                {status === 'wishlist' && (
                  <WishlistPill>
                    <IconHeartFilled size={11} /> Wishlist
                  </WishlistPill>
                )}
              </NameRow>
              {isGraded ? (
                <PriceMissing>Graded — raw market price not applicable</PriceMissing>
              ) : priceUsd != null ? (
                <Price>{fmtPrice(priceUsd, currency, audRate)} raw market</Price>
              ) : card.attributes.tcgId ? (
                <PriceMissing>Price not found in TCGPlayer</PriceMissing>
              ) : (
                <PriceMissing>No TCG reference linked</PriceMissing>
              )}
            </div>

            <Attributes>
              <AttrBlock>
                <AttrLabel>Set</AttrLabel>
                <AttrValue title={card.attributes.set}>{card.attributes.set || '—'}</AttrValue>
              </AttrBlock>
              <AttrBlock>
                <AttrLabel>Type</AttrLabel>
                <AttrValue>{card.pokemonData.type || '—'}</AttrValue>
              </AttrBlock>
              <AttrBlock>
                <AttrLabel>Rarity</AttrLabel>
                <AttrValue>{card.attributes.rarity || '—'}</AttrValue>
              </AttrBlock>
              <AttrBlock>
                <AttrLabel>Condition</AttrLabel>
                <AttrValue>{card.attributes.condition || '—'}</AttrValue>
              </AttrBlock>
              <AttrBlock>
                <AttrLabel>Quantity</AttrLabel>
                <AttrValue>×{card.quantity ?? 1}</AttrValue>
              </AttrBlock>
              <AttrBlock>
                <AttrLabel>Variant</AttrLabel>
                <AttrValue>{formatVariantLabel(card)}</AttrValue>
              </AttrBlock>
              {isGraded && (
                <AttrBlock>
                  <AttrLabel>Grading</AttrLabel>
                  <AttrValue>PSA/BGS {card.attributes.grading || '—'}</AttrValue>
                </AttrBlock>
              )}
              {card.attributes.tcgId && (
                <AttrBlock>
                  <AttrLabel>TCG ID</AttrLabel>
                  <AttrValue title={card.attributes.tcgId}>{card.attributes.tcgId}</AttrValue>
                </AttrBlock>
              )}
            </Attributes>

            <NotesWrap>
              <NotesLabel htmlFor='card-notes'>Notes</NotesLabel>
              <NotesArea
                id='card-notes'
                placeholder='Where you got it, condition quirks, trade history…'
                value={notesDraft}
                onChange={onNotesChange}
                disabled={isReadOnly}
              />
              <NotesStatus $state={notesState}>
                {notesState === 'saving'
                  ? 'Saving…'
                  : notesState === 'saved'
                    ? <><IconCheck size={11} stroke={2.5} /> Saved</>
                    : isReadOnly
                      ? 'Read-only mode — notes won’t save'
                      : 'Changes auto-save'}
              </NotesStatus>
            </NotesWrap>

            <Actions>
              <DangerBtn
                onClick={handleDelete}
                disabled={deleting || isReadOnly}
                whileTap={tapPress}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <IconTrash size={14} stroke={2} />
                {deleting ? 'Removing…' : 'Remove from collection'}
              </DangerBtn>
            </Actions>
          </Panel>
        </Grid>

        {related.length > 0 && (
          <>
            <RelatedHeader>More from {card.attributes.set}</RelatedHeader>
            <RelatedStrip>
              {related.map((r) => {
                const img = getImg(r);
                return (
                  <RelatedCardLink key={r.cardId} to={`/collections/${r.cardId}`}>
                    {img ? (
                      <img src={img} alt={r.pokemonData.name} loading='lazy' />
                    ) : (
                      <ArtPlaceholder>
                        <IconPhotoScan size='40%' stroke={1} />
                      </ArtPlaceholder>
                    )}
                    <RelatedName>{r.pokemonData.name}</RelatedName>
                  </RelatedCardLink>
                );
              })}
            </RelatedStrip>
          </>
        )}
      </SectionWrapper>
    </Main>
  );
}
