import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { Skeleton } from '@/components/Skeleton';
import { Progress } from '@/components/Progress';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AccountCard } from '@/auth/AccountCard';
import { useCards } from '@/api/useCards';
import { useTcgSets } from '@/api/tcgApi';
import { useAudRate, fmtAud } from '@/hooks/useAudRate';
import { imgUrl, isOwned } from '@/api/card';

export default function OverviewScreen() {
  const { cards, loading } = useCards();
  const { sets } = useTcgSets();
  const audRate = useAudRate();

  // Re-run the count-ups / fills each time the tab is viewed (screens stay
  // mounted, so without this the entrance motion would only play once).
  const [runKey, setRunKey] = useState(0);
  useFocusEffect(useCallback(() => { setRunKey((k) => k + 1); }, []));

  const setTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sets) m.set(s.name.toLowerCase(), s.total);
    return m;
  }, [sets]);

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
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={{ padding: 20 }}>
            <Skeleton width={90} height={12} radius={6} />
            <Skeleton width={160} height={36} radius={10} style={{ marginTop: 10 }} />
            <Skeleton width="100%" height={120} radius={24} style={{ marginTop: 16 }} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Skeleton height={78} radius={18} style={{ flex: 1 }} />
              <Skeleton height={78} radius={18} style={{ flex: 1 }} />
              <Skeleton height={78} radius={18} style={{ flex: 1 }} />
            </View>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  return (
    <Background>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 130 }}>
          <HeaderRow>
            <View>
              <Eyebrow>POLARDEX</Eyebrow>
              <Title>Overview</Title>
            </View>
            <ThemeToggle />
          </HeaderRow>

          <Glass radius={24} intensity={40} style={{ padding: 22, marginTop: 8 }}>
            <ValueLabel>Collection value</ValueLabel>
            <ValueAmount key={runKey} value={stats.value} format={(n: number) => fmtAud(n, audRate)} />
            <ValueSub>{stats.totalQty} cards · {stats.sets} sets</ValueSub>
          </Glass>

          <StatRow>
            <StatTile label="Owned" value={stats.ownedCount} rerun={runKey} />
            <StatTile label="Wishlist" value={stats.wishlistCount} rerun={runKey} />
            <StatTile label="Sets" value={stats.sets} rerun={runKey} />
          </StatRow>

          {stats.recent.length > 0 && (
            <>
              <SectionTitle>Recently added</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
                {stats.recent.map((c) => (
                  <Glass key={c.cardId} radius={14} intensity={32} style={{ padding: 6, width: 96 }}>
                    <RecentImg source={{ uri: imgUrl(c) }} contentFit="contain" transition={150} />
                    <RecentName numberOfLines={1}>{c.pokemonData.name}</RecentName>
                  </Glass>
                ))}
              </ScrollView>
            </>
          )}

          {stats.topSets.length > 0 && (
            <>
              <SectionTitle>Top sets</SectionTitle>
              <Glass radius={18} intensity={30} style={{ padding: 6 }}>
                {stats.topSets.map(([set, count], i) => {
                  const total = setTotals.get(set.toLowerCase());
                  const pct = total ? Math.min(1, count / total) : 0;
                  return (
                    <SetRow key={set} style={{ borderTopWidth: i === 0 ? 0 : 1 }}>
                      <View style={{ flex: 1 }}>
                        <SetName numberOfLines={1}>{set}</SetName>
                        <View style={{ marginTop: 7 }}>
                          <Progress key={runKey} value={pct} height={5} />
                        </View>
                      </View>
                      <SetCount>{total ? `${Math.round(pct * 100)}%` : count}</SetCount>
                    </SetRow>
                  );
                })}
              </Glass>
            </>
          )}

          <SectionTitle>Account</SectionTitle>
          <AccountCard />
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

function StatTile({ label, value, rerun }: { label: string; value: number; rerun: number }) {
  return (
    <Glass radius={18} intensity={32} style={{ flex: 1, paddingVertical: 16, alignItems: 'center' }}>
      <TileValue key={rerun} value={value} format={(n: number) => String(Math.round(n))} />
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

const HeaderRow = styled(View)`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
`;

const ValueLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;

const ValueAmount = styled(AnimatedNumber)`
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

const TileValue = styled(AnimatedNumber)`
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
