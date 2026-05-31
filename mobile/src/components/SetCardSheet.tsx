import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from './Glass';
import { useAudRate, fmtAud } from '@/hooks/useAudRate';
import { tcgToCard } from '@/api/setCard';
import { saveCard, removeCard } from '@/api/mutations';
import { TcgCard, pickPrice } from '@/services/tcg';
import { CardModel } from '@/api/types';

export const SetCardSheet = forwardRef<
  BottomSheetModal,
  { card: TcgCard | null; owned: CardModel | null; wished: CardModel | null }
>(function SetCardSheet({ card, owned, wished }, ref) {
  const theme = useTheme();
  const audRate = useAudRate();
  const price = card ? pickPrice(card) : undefined;
  const variants = owned?.attributes.variants ?? { normal: false, alternate: false };

  const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const sel = () => Haptics.selectionAsync();

  const addVariant = (which: 'normal' | 'alternate') => {
    if (!card) return;
    tap();
    if (!owned) { saveCard(tcgToCard(card, 'owned', which)); return; }
    const nv = { ...variants, [which]: !variants[which] };
    if (!nv.normal && !nv.alternate) { removeCard(owned.cardId); return; }
    saveCard({ ...owned, attributes: { ...owned.attributes, variants: nv } });
  };
  const changeQty = (delta: number) => {
    if (!owned) return;
    sel();
    const next = (owned.quantity ?? 1) + delta;
    if (next <= 0) removeCard(owned.cardId);
    else saveCard({ ...owned, quantity: next });
  };
  const toggleWishlist = () => {
    if (!card) return;
    sel();
    if (wished) removeCard(wished.cardId);
    else saveCard(tcgToCard(card, 'wishlist'));
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['80%']}
      enableDynamicSizing={false}
      handleIndicatorStyle={{ backgroundColor: theme.color.text.tertiary, width: 44 }}
      backgroundComponent={({ style }) => (
        <BlurView intensity={75} tint={theme.glass.tint} style={[style, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: theme.glass.border }]} />
      )}
      backdropComponent={(props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} />
      )}>
      <BottomSheetView style={{ paddingHorizontal: 24, paddingBottom: 36, alignItems: 'center' }}>
        {card && (
          <>
            <Hero source={{ uri: card.images.large ?? card.images.small }} contentFit="contain" transition={150} />
            <Name numberOfLines={2}>{card.name}</Name>
            <Subtitle numberOfLines={1}>
              {card.set.name} · #{card.number}{card.rarity ? ` · ${card.rarity}` : ''}
            </Subtitle>
            {price != null && (
              <Glass radius={999} intensity={28} style={{ marginTop: 12, paddingVertical: 6, paddingHorizontal: 16 }}>
                <PriceText>{fmtAud(price, audRate)}</PriceText>
              </Glass>
            )}

            {/* Variants — tap to add / toggle ownership of each printing */}
            <SectionLabel>{owned ? 'In your collection' : 'Add to collection'}</SectionLabel>
            <VariantRow>
              <VariantBtn $active={variants.normal} onPress={() => addVariant('normal')}>
                <SymbolView name={variants.normal ? 'checkmark.circle.fill' : 'plus.circle'} tintColor={variants.normal ? (theme.dark ? '#1b2027' : '#fff') : theme.color.text.primary} size={20} />
                <VariantText $active={variants.normal}>Normal</VariantText>
              </VariantBtn>
              <VariantBtn $active={variants.alternate} onPress={() => addVariant('alternate')}>
                <SymbolView name={variants.alternate ? 'checkmark.circle.fill' : 'plus.circle'} tintColor={variants.alternate ? (theme.dark ? '#1b2027' : '#fff') : theme.color.text.primary} size={20} />
                <VariantText $active={variants.alternate}>Alternate</VariantText>
              </VariantBtn>
            </VariantRow>

            {/* Quantity (only once owned) */}
            {owned && (
              <QtyWrap>
                <QtyLabel>Quantity</QtyLabel>
                <QtyRow>
                  <Stepper onPress={() => changeQty(-1)}><StepperText>−</StepperText></Stepper>
                  <QtyValue>{owned.quantity ?? 1}</QtyValue>
                  <Stepper onPress={() => changeQty(1)}><StepperText>+</StepperText></Stepper>
                </QtyRow>
              </QtyWrap>
            )}

            {/* Wishlist (only when not owned) */}
            {!owned && (
              <Pressable onPress={toggleWishlist} style={{ marginTop: 18 }}>
                <WishRow>
                  <SymbolView name={wished ? 'heart.fill' : 'heart'} tintColor={wished ? theme.color.aurora.red : theme.color.text.secondary} size={16} />
                  <WishText>{wished ? 'On your wishlist' : 'Add to wishlist'}</WishText>
                </WishRow>
              </Pressable>
            )}
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const Hero = styled(Image)`
  width: 58%;
  aspect-ratio: 0.72;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
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
const PriceText = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const SectionLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: ${({ theme }) => theme.space[6]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const VariantRow = styled(View)`
  flex-direction: row;
  gap: ${({ theme }) => theme.space[3]}px;
  align-self: stretch;
`;
const VariantBtn = styled(Pressable)<{ $active: boolean }>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]}px;
  height: 54px;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  background-color: ${({ theme, $active }) => ($active ? theme.accent : theme.glass.fill)};
  border-width: 1px;
  border-color: ${({ theme, $active }) => ($active ? 'transparent' : theme.glass.border)};
`;
const VariantText = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) => ($active ? (theme.dark ? '#1b2027' : '#fff') : theme.color.text.primary)};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const QtyWrap = styled(View)`
  align-items: center;
  margin-top: ${({ theme }) => theme.space[5]}px;
`;
const QtyLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  margin-bottom: ${({ theme }) => theme.space[2]}px;
`;
const QtyRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.space[5]}px;
`;
const Stepper = styled(Pressable)`
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ theme }) => theme.glass.fill};
  border-width: 1px;
  border-color: ${({ theme }) => theme.glass.border};
`;
const StepperText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.xl}px;
`;
const QtyValue = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xxl}px;
  min-width: 36px;
  text-align: center;
`;
const WishRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const WishText = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;
