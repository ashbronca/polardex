import { forwardRef, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  useBottomSheetModal,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from './Glass';
import { useAudRate, fmtAud } from '@/hooks/useAudRate';
import { imgUrl, isOwned } from '@/api/card';
import { getVariantQty } from '@/api/setCard';
import { saveCard, removeCard } from '@/api/mutations';
import { useAuth } from '@/auth/AuthProvider';
import { CardModel } from '@/api/types';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Glass radius={14} intensity={26} style={{ paddingVertical: 8, paddingHorizontal: 14, minWidth: 72, alignItems: 'center' }}>
      <StatValue numberOfLines={1}>{value}</StatValue>
      <StatLabel>{label}</StatLabel>
    </Glass>
  );
}

export const CardDetailSheet = forwardRef<BottomSheetModal, { card: CardModel | null }>(
  function CardDetailSheet({ card }, ref) {
    const theme = useTheme();
    const audRate = useAudRate();
    const insets = useSafeAreaInsets();
    const { canEdit } = useAuth();
    const { dismiss } = useBottomSheetModal();
    const a = card?.attributes;
    const owned = card ? isOwned(card) : false;

    // Optimistic per-variant counts for the open card.
    const [counts, setCounts] = useState(() => getVariantQty(card));
    useEffect(() => { setCounts(getVariantQty(card)); /* eslint-disable-next-line */ }, [card?.cardId]);
    const total = counts.normal + counts.alternate;

    const setVariant = (which: 'normal' | 'alternate', delta: number) => {
      if (!card) return;
      const next = { ...counts, [which]: Math.max(0, counts[which] + delta) };
      const newTotal = next.normal + next.alternate;
      Haptics.selectionAsync();
      setCounts(next); // optimistic
      if (newTotal <= 0) {
        removeCard(card.cardId);
        dismiss();
        return;
      }
      saveCard({
        ...card,
        quantity: newTotal,
        attributes: {
          ...card.attributes,
          variants: { normal: next.normal > 0, alternate: next.alternate > 0 },
          variantQty: { normal: next.normal, alternate: next.alternate },
        },
      });
    };

    const moveToCollection = () => {
      if (!card) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      saveCard({
        ...card,
        status: 'owned',
        quantity: 1,
        attributes: { ...card.attributes, variantQty: { normal: 1, alternate: 0 }, variants: { normal: true, alternate: false } },
      });
      dismiss();
    };

    const remove = () => {
      if (!card) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      removeCard(card.cardId);
      dismiss();
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['82%']}
        enableDynamicSizing={false}
        handleIndicatorStyle={{ backgroundColor: theme.color.text.tertiary, width: 44 }}
        backgroundComponent={({ style }) => (
          <BlurView
            intensity={70}
            tint={theme.glass.tint}
            style={[style, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: theme.glass.border }]}
          />
        )}
        backdropComponent={(props: BottomSheetBackdropProps) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} />
        )}>
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 48, alignItems: 'center' }}>
          {card && a && (
            <>
              <HeroImage source={{ uri: imgUrl(card) }} contentFit="contain" transition={150} />
              <Name numberOfLines={2}>{card.pokemonData.name}</Name>
              <Subtitle numberOfLines={1}>
                {a.set}{card.pokemonData.type ? ` · ${card.pokemonData.type}` : ''}
              </Subtitle>

              <StatRow>
                {!!a.rarity && <Stat label="Rarity" value={a.rarity} />}
                {!!a.condition && <Stat label="Condition" value={a.condition} />}
                {a.marketPrice != null && a.marketPrice > 0 && (
                  <Stat label="Market" value={fmtAud(a.marketPrice, audRate)} />
                )}
              </StatRow>

              {!canEdit ? (
                <Glass radius={14} intensity={26} style={{ marginTop: 18, paddingVertical: 8, paddingHorizontal: 16 }}>
                  <StatValue>{owned ? `Qty ${card.quantity ?? 1}` : 'On wishlist'}</StatValue>
                </Glass>
              ) : owned ? (
                <>
                  <SectionLabel>In your collection</SectionLabel>
                  <VariantStepper label="Normal" hint="Standard print" count={counts.normal} onChange={(d) => setVariant('normal', d)} />
                  <VariantStepper label="Alternate" hint="Rev. holo / alt art" count={counts.alternate} onChange={(d) => setVariant('alternate', d)} />
                  <TotalRow>
                    <TotalLabel>Total</TotalLabel>
                    <TotalValue>{total}</TotalValue>
                  </TotalRow>
                  <Pressable onPress={remove} style={{ marginTop: 18 }}>
                    <RemoveRow>
                      <SymbolView name="trash" tintColor={theme.color.aurora.red} size={15} />
                      <RemoveText>Remove from collection</RemoveText>
                    </RemoveRow>
                  </Pressable>
                </>
              ) : (
                <>
                  <SectionLabel>On your wishlist</SectionLabel>
                  <Pressable onPress={moveToCollection} style={{ alignSelf: 'stretch' }}>
                    <MoveRow>
                      <SymbolView name="checkmark.circle.fill" tintColor={theme.accent} size={18} />
                      <MoveText>Move to collection</MoveText>
                    </MoveRow>
                  </Pressable>
                  <Pressable onPress={remove} style={{ marginTop: 14 }}>
                    <RemoveRow>
                      <SymbolView name="heart.slash" tintColor={theme.color.aurora.red} size={15} />
                      <RemoveText>Remove from wishlist</RemoveText>
                    </RemoveRow>
                  </Pressable>
                </>
              )}

              {!!card.notes && (
                <Glass radius={16} intensity={24} style={{ marginTop: 18, padding: 16, alignSelf: 'stretch' }}>
                  <NotesLabel>Notes</NotesLabel>
                  <Notes>{card.notes}</Notes>
                </Glass>
              )}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

function VariantStepper({ label, hint, count, onChange }: { label: string; hint: string; count: number; onChange: (d: number) => void }) {
  const theme = useTheme();
  const active = count > 0;
  return (
    <Glass radius={16} intensity={26} style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginTop: 10 }}>
      <View>
        <VariantName>{label}</VariantName>
        <VariantHint>{hint}</VariantHint>
      </View>
      <Stepper>
        <StepBtn onPress={() => onChange(-1)} style={{ opacity: count === 0 ? 0.4 : 1 }} disabled={count === 0}>
          <StepText>−</StepText>
        </StepBtn>
        <Count style={{ color: active ? theme.accent : theme.color.text.tertiary }}>{count}</Count>
        <StepBtn onPress={() => onChange(1)}>
          <StepText>+</StepText>
        </StepBtn>
      </Stepper>
    </Glass>
  );
}

const HeroImage = styled(Image)`
  width: 64%;
  aspect-ratio: 0.72;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;

const Name = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xxl}px;
  text-align: center;
`;

const Subtitle = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  margin-top: ${({ theme }) => theme.space[1]}px;
`;

const StatRow = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[5]}px;
`;

const StatValue = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;

const StatLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SectionLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  align-self: flex-start;
  margin-top: ${({ theme }) => theme.space[6]}px;
`;

const VariantName = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const VariantHint = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  margin-top: 1px;
`;
const Stepper = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const StepBtn = styled(Pressable)`
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ theme }) => theme.glass.fill};
  border-width: 1px;
  border-color: ${({ theme }) => theme.glass.border};
`;
const StepText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.lg}px;
`;
const Count = styled.Text`
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xl}px;
  min-width: 26px;
  text-align: center;
`;
const TotalRow = styled(View)`
  align-self: stretch;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.space[5]}px;
  padding: 0 4px;
`;
const TotalLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;
const TotalValue = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xxl}px;
`;
const MoveRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]}px;
  align-self: stretch;
  margin-top: ${({ theme }) => theme.space[3]}px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  background-color: ${({ theme }) => theme.glass.fill};
  border-width: 1px;
  border-color: ${({ theme }) => theme.glass.border};
`;
const MoveText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const RemoveRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const RemoveText = styled.Text`
  color: ${({ theme }) => theme.color.aurora.red};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;
const NotesLabel = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  letter-spacing: 1px;
  margin-bottom: ${({ theme }) => theme.space[1]}px;
`;
const Notes = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  line-height: 20px;
`;
