import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { useCards } from '@/api/useCards';
import { useAudRate, fmtAud } from '@/hooks/useAudRate';
import { CardModel } from '@/api/types';

const imgUrl = (c: CardModel) => c.attributes.tcgImageUrl || c.pokemonData.imageUrl || '';
const isOwned = (c: CardModel) => (c.status ?? 'owned') !== 'wishlist';

export default function OverviewScreen() {
  const { cards, loading } = useCards();
  const audRate = useAudRate();

  const stats = useMemo(() => {
    const owned = cards.filter(isOwned);
    const wishlist = cards.filter((c) => !isOwned(c));
    let value = 0;
    let totalQty = 0;
    for (const c of owned) {
      totalQty += c.quantity ?? 1;
      const p = c.attributes.marketPrice;
      if (p && p > 0) value += p * (c.quantity ?? 1);
    }
    const sets = new Set(owned.map((c) => c.attributes.set)).size;

    const recent = [...owned]
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 10);

    const bySet = new Map<string, number>();
    for (const c of owned) bySet.set(c.attributes.set, (bySet.get(c.attributes.set) ?? 0) + 1);
    const topSets = [...bySet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { ownedCount: owned.length, wishlistCount: wishlist.length, value, totalQty, sets, recent, topSets };
  }, [cards]);

  if (loading) {
    return (
      <Background>
        <Centered><ActivityIndicator /></Centered>
      </Background>
    );
  }

  return (
    <Background>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 130 }}>
          <Eyebrow>POLARDEX</Eyebrow>
          <Title>Overview</Title>

          <Animated.View entering={FadeInDown.delay(40).springify().damping(16)}>
            <Glass radius={24} intensity={40} style={{ padding: 22, marginTop: 8 }}>
              <ValueLabel>Collection value</ValueLabel>
              <ValueAmount>{fmtAud(stats.value, audRate)}</ValueAmount>
              <ValueSub>{stats.totalQty} cards · {stats.sets} sets</ValueSub>
            </Glass>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).springify().damping(16)}>
            <StatRow>
              <StatTile label="Owned" value={stats.ownedCount} />
              <StatTile label="Wishlist" value={stats.wishlistCount} />
              <StatTile label="Sets" value={stats.sets} />
            </StatRow>
          </Animated.View>

          {stats.recent.length > 0 && (
            <Animated.View entering={FadeInDown.delay(160).springify().damping(16)}>
              <SectionTitle>Recently added</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
                {stats.recent.map((c) => (
                  <Glass key={c.cardId} radius={14} intensity={32} style={{ padding: 6, width: 96 }}>
                    <RecentImg source={{ uri: imgUrl(c) }} contentFit="contain" transition={150} />
                    <RecentName numberOfLines={1}>{c.pokemonData.name}</RecentName>
                  </Glass>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {stats.topSets.length > 0 && (
            <Animated.View entering={FadeInDown.delay(220).springify().damping(16)}>
              <SectionTitle>Top sets</SectionTitle>
              <Glass radius={18} intensity={30} style={{ padding: 6 }}>
                {stats.topSets.map(([set, count], i) => (
                  <SetRow key={set} style={{ borderTopWidth: i === 0 ? 0 : 1 }}>
                    <SetName numberOfLines={1}>{set}</SetName>
                    <SetCount>{count}</SetCount>
                  </SetRow>
                ))}
              </Glass>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Glass radius={18} intensity={32} style={{ flex: 1, paddingVertical: 16, alignItems: 'center' }}>
      <TileValue>{value}</TileValue>
      <TileLabel>{label}</TileLabel>
    </Glass>
  );
}

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  letter-spacing: 2px;
  margin-bottom: ${({ theme }) => theme.space[1]}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xxxl}px;
`;

const ValueLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;

const ValueAmount = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: 40px;
  margin-top: 2px;
`;

const ValueSub = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  margin-top: ${({ theme }) => theme.space[1]}px;
`;

const StatRow = styled(View)`
  flex-direction: row;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-top: ${({ theme }) => theme.space[3]}px;
`;

const TileValue = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.xxl}px;
`;

const TileLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  margin-top: 2px;
`;

const SectionTitle = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.lg}px;
  margin-top: ${({ theme }) => theme.space[6]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;

const RecentImg = styled(Image)`
  width: 100%;
  aspect-ratio: 0.72;
  border-radius: ${({ theme }) => theme.radius.sm}px;
`;

const RecentName = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  margin-top: ${({ theme }) => theme.space[1]}px;
`;

const SetRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px;
  border-top-color: ${({ theme }) => theme.glass.border};
`;

const SetName = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;

const SetCount = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
  margin-left: ${({ theme }) => theme.space[3]}px;
`;

const Centered = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;
