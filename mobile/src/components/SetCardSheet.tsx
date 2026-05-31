import { forwardRef, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from './Glass';
import { useAudRate, fmtAud } from '@/hooks/useAudRate';
import { tcgToCard, getVariantQty } from '@/api/setCard';
import { HERO_PULSE_UP, HERO_PULSE_DOWN } from '@/theme/motion';
import { useAuth } from '@/auth/AuthProvider';
import { SignInToEdit } from '@/auth/SignInToEdit';
import { saveCard, removeCard } from '@/api/mutations';
import { TcgCard, pickPrice } from '@/services/tcg';
import { CardModel } from '@/api/types';

type V = 'normal' | 'alternate';

export const SetCardSheet = forwardRef<
  BottomSheetModal,
  { card: TcgCard | null; owned: CardModel | null; wished: CardModel | null }
>(function SetCardSheet({ card, owned, wished }, ref) {
  const theme = useTheme();
  const audRate = useAudRate();
  const { canEdit } = useAuth();
  const price = card ? pickPrice(card) : undefined;

  // Optimistic counts — respond instantly instead of waiting for the Firestore
  // round-trip. Reset whenever a different card is opened.
  const [counts, setCounts] = useState(() => getVariantQty(owned));
  useEffect(() => { setCounts(getVariantQty(owned)); /* eslint-disable-next-line */ }, [card?.id]);
  const total = counts.normal + counts.alternate;

  const heroScale = useSharedValue(1);
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ scale: heroScale.value }] }));
  const shine = useSharedValue(0); // 0 = off-left, 1 = off-right
  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value > 0 && shine.value < 1 ? 1 : 0,
    transform: [{ translateX: -120 + shine.value * 360 }, { rotate: '16deg' }],
  }));

  const setVariant = (which: V, delta: number) => {
    if (!card) return;
    const next = { ...counts, [which]: Math.max(0, counts[which] + delta) };
    const newTotal = next.normal + next.alternate;

    if (delta > 0 && total === 0) {
      // First copy added — a little delight: success haptic, hero pulse, and a
      // soft shine sweeping across the card art.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      heroScale.value = withSequence(
        withSpring(1.09, HERO_PULSE_UP),
        withSpring(1, HERO_PULSE_DOWN),
      );
      shine.value = 0;
      shine.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) });
    } else {
      Haptics.selectionAsync();
    }

    setCounts(next); // optimistic
    if (newTotal <= 0) {
      if (owned) removeCard(owned.cardId);
      return;
    }
    const base = owned ?? tcgToCard(card, 'owned');
    saveCard({
      ...base,
      quantity: newTotal,
      attributes: {
        ...base.attributes,
        variants: { normal: next.normal > 0, alternate: next.alternate > 0 },
        variantQty: { normal: next.normal, alternate: next.alternate },
      },
    });
  };

  const toggleWishlist = () => {
    if (!card) return;
    Haptics.selectionAsync();
    if (wished) removeCard(wished.cardId);
    else saveCard(tcgToCard(card, 'wishlist'));
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['82%']}
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
            <Animated.View style={heroStyle}>
              <HeroClip>
                <Hero source={{ uri: card.images.large ?? card.images.small }} contentFit="contain" transition={150} />
                <Animated.View pointerEvents="none" style={[styles.shineBand, shineStyle]}>
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </HeroClip>
            </Animated.View>
            <Name numberOfLines={2}>{card.name}</Name>
            <Subtitle numberOfLines={1}>
              {card.set.name} · #{card.number}{card.rarity ? ` · ${card.rarity}` : ''}
            </Subtitle>
            {price != null && (
              <Glass radius={999} intensity={28} style={{ marginTop: 12, paddingVertical: 6, paddingHorizontal: 16 }}>
                <PriceText>{fmtAud(price, audRate)}</PriceText>
              </Glass>
            )}

            <SectionLabel>{total > 0 ? 'In your collection' : 'Add to collection'}</SectionLabel>

            {canEdit ? (
              <>
                <VariantStepper label="Normal" hint="Standard print" count={counts.normal} onChange={(d) => setVariant('normal', d)} />
                <VariantStepper label="Alternate" hint="Rev. holo / alt art" count={counts.alternate} onChange={(d) => setVariant('alternate', d)} />

                <TotalRow>
                  <TotalLabel>Total</TotalLabel>
                  <TotalValue>{total}</TotalValue>
                </TotalRow>

                {total === 0 && (
                  <Pressable onPress={toggleWishlist} style={{ marginTop: 18 }}>
                    <WishRow>
                      <SymbolView name={wished ? 'heart.fill' : 'heart'} tintColor={wished ? theme.color.aurora.red : theme.color.text.secondary} size={16} />
                      <WishText>{wished ? 'On your wishlist' : 'Add to wishlist'}</WishText>
                    </WishRow>
                  </Pressable>
                )}
              </>
            ) : (
              <SignInToEdit />
            )}
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

function VariantStepper({ label, hint, count, onChange }: { label: string; hint: string; count: number; onChange: (d: number) => void }) {
  const theme = useTheme();
  const active = count > 0;
  return (
    <Glass radius={16} intensity={26} style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginTop: 10 }}>
      <View>
        <VariantName $active={active}>{label}</VariantName>
        <VariantHint>{hint}</VariantHint>
      </View>
      <Stepper>
        <StepBtn onPress={() => onChange(-1)} style={{ opacity: count === 0 ? 0.4 : 1 }} disabled={count === 0}>
          <StepText>−</StepText>
        </StepBtn>
        <Count $active={active} style={{ color: active ? theme.accent : theme.color.text.tertiary }}>{count}</Count>
        <StepBtn onPress={() => onChange(1)}>
          <StepText>+</StepText>
        </StepBtn>
      </Stepper>
    </Glass>
  );
}

const HeroClip = styled.View`
  width: 56%;
  aspect-ratio: 0.72;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  overflow: hidden;
  margin-top: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const Hero = styled(Image)`
  width: 100%;
  height: 100%;
`;
const styles = StyleSheet.create({
  shineBand: { position: 'absolute', top: -30, bottom: -30, width: 60 },
});
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
  align-self: flex-start;
  margin-top: ${({ theme }) => theme.space[6]}px;
`;
const VariantName = styled.Text<{ $active: boolean }>`
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
const Count = styled.Text<{ $active: boolean }>`
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
