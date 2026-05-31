import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from './Glass';
import { useAudRate, fmtAud } from '@/hooks/useAudRate';
import { tcgToCard, getVariantQty } from '@/api/setCard';
import { saveCard, removeCard } from '@/api/mutations';
import { pickPrice } from '@/services/tcg';
import { ScanMatch } from '@/api/scan';
import { CardModel } from '@/api/types';

type V = 'normal' | 'alternate';

/**
 * The frosted "match" card that rises over the live camera when a card is
 * recognised. Lets you add per-variant counts without leaving the scanner, then
 * tap "Scan next" to keep going.
 */
export function ScanMatchCard({
  match,
  ownedByTcg,
  onDismiss,
}: {
  match: ScanMatch | null;
  ownedByTcg: Map<string, CardModel>;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const audRate = useAudRate();

  const [index, setIndex] = useState(0);
  const card = match?.candidates[index] ?? null;
  const owned = card ? ownedByTcg.get(card.id) ?? null : null;
  const price = card ? pickPrice(card) : undefined;

  // The card document we're editing — held locally so rapid taps reuse the same
  // id instead of racing the Firestore snapshot and creating duplicates.
  const working = useRef<CardModel | null>(null);
  const [counts, setCounts] = useState({ normal: 0, alternate: 0 });
  const total = counts.normal + counts.alternate;

  const y = useSharedValue(140);
  const opacity = useSharedValue(0);
  const heroScale = useSharedValue(1);
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ scale: heroScale.value }] }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  // A new match arrived — reset to the top candidate and rise into view.
  useEffect(() => {
    if (!match) return;
    setIndex(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    y.value = 140;
    opacity.value = 0;
    y.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.7 });
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match]);

  // Sync counts whenever the shown candidate changes.
  useEffect(() => {
    working.current = owned ? { ...owned } : null;
    setCounts(getVariantQty(owned));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  const setVariant = (which: V, delta: number) => {
    if (!card) return;
    const next = { ...counts, [which]: Math.max(0, counts[which] + delta) };
    const newTotal = next.normal + next.alternate;

    if (delta > 0 && total === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      heroScale.value = withSequence(
        withSpring(1.07, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 160 }),
      );
    } else {
      Haptics.selectionAsync();
    }

    setCounts(next); // optimistic
    if (newTotal <= 0) {
      const existing = working.current ?? owned;
      if (existing) removeCard(existing.cardId);
      working.current = null;
      return;
    }
    const base = working.current ?? owned ?? tcgToCard(card, 'owned');
    const updated: CardModel = {
      ...base,
      quantity: newTotal,
      attributes: {
        ...base.attributes,
        variants: { normal: next.normal > 0, alternate: next.alternate > 0 },
        variantQty: { normal: next.normal, alternate: next.alternate },
      },
    };
    working.current = updated;
    saveCard(updated);
  };

  const dismiss = () => {
    Haptics.selectionAsync();
    y.value = withTiming(160, { duration: 200, easing: Easing.in(Easing.quad) });
    opacity.value = withTiming(0, { duration: 180 });
    setTimeout(onDismiss, 190);
  };

  const cycle = () => {
    if (!match) return;
    Haptics.selectionAsync();
    setIndex((i) => (i + 1) % match.candidates.length);
  };

  if (!match || !card) return null;

  return (
    <Animated.View style={[styles.wrap, sheetStyle]} pointerEvents="box-none">
      <BlurView
        intensity={70}
        tint={theme.glass.tint}
        style={[styles.sheet, { borderColor: theme.glass.border }]}>
        <Row>
          <Animated.View style={heroStyle}>
            <HeroClip>
              <Image
                source={{ uri: card.images.small }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                transition={160}
              />
            </HeroClip>
          </Animated.View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Name numberOfLines={1}>{card.name}</Name>
            <Sub numberOfLines={1}>
              {card.set.name} · #{card.number}
            </Sub>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              {price != null && (
                <Glass radius={999} intensity={26} style={{ paddingVertical: 4, paddingHorizontal: 10 }}>
                  <Price>{fmtAud(price, audRate)}</Price>
                </Glass>
              )}
              {match.candidates.length > 1 && (
                <Pressable onPress={cycle} hitSlop={8}>
                  <NotIt>Not it? ›</NotIt>
                </Pressable>
              )}
            </View>
          </View>

          <Pressable onPress={dismiss} hitSlop={10} style={styles.close}>
            <SymbolView name="xmark" tintColor={theme.color.text.secondary} size={15} weight="bold" />
          </Pressable>
        </Row>

        <StepperRow>
          <VariantStepper label="Normal" count={counts.normal} onChange={(d) => setVariant('normal', d)} />
          <VariantStepper label="Alternate" count={counts.alternate} onChange={(d) => setVariant('alternate', d)} />
        </StepperRow>

        <Pressable onPress={dismiss}>
          <NextBtn>
            <LinearGradient
              colors={[theme.accent, theme.color.frost.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <NextText>{total > 0 ? `Saved · ${total} · Scan next` : 'Scan next'}</NextText>
          </NextBtn>
        </Pressable>
      </BlurView>
    </Animated.View>
  );
}

function VariantStepper({ label, count, onChange }: { label: string; count: number; onChange: (d: number) => void }) {
  const theme = useTheme();
  const active = count > 0;
  return (
    <Glass radius={14} intensity={24} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
      <VLabel>{label}</VLabel>
      <Stepper>
        <StepBtn onPress={() => onChange(-1)} style={{ opacity: count === 0 ? 0.35 : 1 }} disabled={count === 0}>
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

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, paddingBottom: 28 },
  sheet: { borderRadius: 26, overflow: 'hidden', borderWidth: 1, padding: 16 },
  close: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
});

const Row = styled(View)`
  flex-direction: row;
  align-items: center;
`;
const HeroClip = styled.View`
  width: 64px;
  aspect-ratio: 0.72;
  border-radius: ${({ theme }) => theme.radius.md}px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.glass.fill};
`;
const Name = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.lg}px;
`;
const Sub = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  margin-top: 1px;
`;
const Price = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
`;
const NotIt = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
`;
const StepperRow = styled(View)`
  flex-direction: row;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-top: ${({ theme }) => theme.space[4]}px;
`;
const VLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 6px;
`;
const Stepper = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const StepBtn = styled(Pressable)`
  width: 34px;
  height: 34px;
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
  font-size: ${({ theme }) => theme.fontSize.lg}px;
  min-width: 22px;
  text-align: center;
`;
const NextBtn = styled(View)`
  margin-top: ${({ theme }) => theme.space[4]}px;
  height: 50px;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
`;
const NextText = styled.Text`
  color: #fff;
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
