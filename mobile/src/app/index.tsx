import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import Animated, { runOnJS, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import styled, { useTheme } from 'styled-components/native';

import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { Skeleton } from '@/components/Skeleton';
import { PressableScale } from '@/components/PressableScale';
import { GlassRefreshIndicator, RefreshSpacer, PULL_THRESHOLD } from '@/components/GlassRefresh';
import { CardDetailSheet } from '@/components/CardDetailSheet';
import { EmptyState } from '@/components/EmptyState';
import { CollectionFilterSheet, SortKey } from '@/components/CollectionFilterSheet';
import { useCards } from '@/api/useCards';
import { imgUrl } from '@/api/card';
import { CardModel } from '@/api/types';

type Status = 'owned' | 'wishlist';

export default function CollectionScreen() {
  const theme = useTheme();
  const { cards, loading, error } = useCards();
  const [status, setStatus] = useState<Status>('owned');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [selectedSets, setSelectedSets] = useState<string[]>([]);
  const [selected, setSelected] = useState<CardModel | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const sheetRef = useRef<BottomSheetModal>(null);
  const filterRef = useRef<BottomSheetModal>(null);
  const filterActive = sort !== 'name' || selectedSets.length > 0;

  const toggleSet = useCallback((s: string) => {
    Haptics.selectionAsync();
    setSelectedSets((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }, []);
  const clearSets = useCallback(() => setSelectedSets([]), []);
  const clearAll = useCallback(() => { setSort('name'); setSelectedSets([]); }, []);

  // Custom pull-to-refresh. Data is live via Firestore, so this is a tactile
  // pulse; the glass indicator follows the pull and spins while refreshing.
  const refreshingRef = useRef(false);
  const scrollY = useSharedValue(0);
  const triggerRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); refreshingRef.current = false; }, 1100);
  }, []);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
    onEndDrag: (e) => { if (e.contentOffset.y <= -PULL_THRESHOLD) runOnJS(triggerRefresh)(); },
  });

  const counts = useMemo(() => {
    let owned = 0, wishlist = 0;
    for (const c of cards) (c.status ?? 'owned') === 'wishlist' ? wishlist++ : owned++;
    return { owned, wishlist };
  }, [cards]);

  const collectionSets = useMemo(() => {
    const s = new Set<string>();
    for (const c of cards) if (c.attributes.set) s.add(c.attributes.set);
    return [...s].sort();
  }, [cards]);

  const displayed = useMemo(() => {
    let base = cards.filter((c) => (c.status ?? 'owned') === status);
    if (selectedSets.length) base = base.filter((c) => selectedSets.includes(c.attributes.set));
    const q = search.trim().toLowerCase();
    if (q) base = base.filter((c) => c.pokemonData.name.toLowerCase().includes(q));
    const arr = [...base];
    const price = (c: CardModel) => c.attributes.marketPrice ?? 0;
    if (sort === 'recent') arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    else if (sort === 'priceHigh') arr.sort((a, b) => price(b) - price(a));
    else if (sort === 'priceLow') arr.sort((a, b) => (price(a) || Infinity) - (price(b) || Infinity));
    else arr.sort((a, b) => a.pokemonData.name.localeCompare(b.pokemonData.name));
    return arr;
  }, [cards, status, search, selectedSets, sort]);

  const openCard = useCallback((card: CardModel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(card);
    sheetRef.current?.present();
  }, []);

  return (
    <Background>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header>
          <Eyebrow>POLARDEX</Eyebrow>
          <Title>Collection</Title>

          <Segmented>
            {(['owned', 'wishlist'] as Status[]).map((s) => {
              const active = status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => { Haptics.selectionAsync(); setStatus(s); }}
                  style={{ flex: 1 }}>
                  <Segment $active={active}>
                    <SegmentText $active={active}>
                      {s === 'owned' ? 'Owned' : 'Wishlist'} {s === 'owned' ? counts.owned : counts.wishlist}
                    </SegmentText>
                  </Segment>
                </Pressable>
              );
            })}
          </Segmented>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Glass radius={14} intensity={26} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 44 }}>
              <SymbolView name="magnifyingglass" tintColor={theme.color.text.secondary} size={16} />
              <SearchInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name"
                placeholderTextColor={theme.color.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Glass>
            <Pressable onPress={() => { Haptics.selectionAsync(); filterRef.current?.present(); }}>
              <Glass radius={14} intensity={26} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <SymbolView name="slider.horizontal.3" tintColor={filterActive ? theme.accent : theme.color.text.secondary} size={18} />
                {filterActive && <FilterDot />}
              </Glass>
            </Pressable>
          </View>
        </Header>

        {error ? (
          <Centered><Muted>{error}</Muted></Centered>
        ) : loading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingTop: 8, gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} width="47%" height={184} radius={18} />
            ))}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <GlassRefreshIndicator scrollY={scrollY} refreshing={refreshing} />
            <Animated.FlatList
              data={displayed}
              keyExtractor={(c: CardModel) => c.cardId}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              ListHeaderComponent={<RefreshSpacer refreshing={refreshing} />}
              contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 130 }}
              columnWrapperStyle={{ gap: 12 }}
              ItemSeparatorComponent={() => <Gap />}
              ListEmptyComponent={
                <Centered style={{ paddingTop: 80 }}>
                  {search ? (
                    <EmptyState icon="magnifyingglass" title="No matches" subtitle={`Nothing in your collection matches “${search}”.`} />
                  ) : status === 'wishlist' ? (
                    <EmptyState icon="heart" title="No wishlist yet" subtitle="Add cards you're hunting for from any set, and they'll show up here." />
                  ) : (
                    <EmptyState icon="sparkles" title="Start your collection" subtitle="Scan a card or browse a set to add your first cards." />
                  )}
                </Centered>
              }
              renderItem={({ item }: { item: CardModel }) => (
                <View style={{ flex: 1 }}>
                  <PressableScale onPress={() => openCard(item)} scaleTo={0.97}>
                    <Glass radius={18} intensity={36} style={{ padding: 8 }}>
                      <CardArt source={{ uri: imgUrl(item) }} contentFit="contain" transition={180} />
                      <Name numberOfLines={1}>{item.pokemonData.name}</Name>
                      <SetLabel numberOfLines={1}>{item.attributes.set}</SetLabel>
                    </Glass>
                  </PressableScale>
                </View>
              )}
            />
          </View>
        )}
      </SafeAreaView>

      <CardDetailSheet ref={sheetRef} card={selected} />
      <CollectionFilterSheet
        ref={filterRef}
        sort={sort}
        onSort={setSort}
        selectedSets={selectedSets}
        onToggleSet={toggleSet}
        onClearSets={clearSets}
        onClearAll={clearAll}
        active={filterActive}
        sets={collectionSets}
      />
    </Background>
  );
}

const Header = styled.View`
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[3]}px;
`;

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
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;

const Segmented = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const Segment = styled.View<{ $active: boolean }>`
  align-items: center;
  justify-content: center;
  padding: 10px 0;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ theme, $active }) => ($active ? theme.accent : theme.glass.fill)};
  border-width: 1px;
  border-color: ${({ theme, $active }) => ($active ? 'transparent' : theme.glass.border)};
`;

const SegmentText = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) => ($active ? theme.color.text.onAccent : theme.color.text.secondary)};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;

const SearchInput = styled(TextInput)`
  flex: 1;
  margin-left: ${({ theme }) => theme.space[2]}px;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;

const CardArt = styled(Image)`
  width: 100%;
  aspect-ratio: 0.72;
  border-radius: ${({ theme }) => theme.radius.md}px;
`;

const Name = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;

const SetLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  margin-top: 2px;
`;

const Gap = styled.View`
  height: ${({ theme }) => theme.space[3]}px;
`;

const Centered = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const Muted = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
`;

const FilterDot = styled.View`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.accent};
`;
