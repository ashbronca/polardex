import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import styled, { useTheme } from 'styled-components/native';

import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { Progress } from '@/components/Progress';
import { SetCardSheet } from '@/components/SetCardSheet';
import { useTcgSets, useSetCards } from '@/api/tcgApi';
import { TcgCard, TcgSet } from '@/services/tcg';
import { useCards } from '@/api/useCards';
import { CardModel } from '@/api/types';

type ViewFilter = 'all' | 'owned' | 'missing';

export default function SetsScreen() {
  const theme = useTheme();
  const { sets } = useTcgSets();
  const { cards } = useCards();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TcgSet | null>(null);

  const ownedByTcg = useMemo(() => {
    const m = new Map<string, CardModel>();
    for (const c of cards) {
      const id = c.attributes.tcgId;
      if (id && (c.status ?? 'owned') !== 'wishlist') m.set(id, c);
    }
    return m;
  }, [cards]);

  const wishByTcg = useMemo(() => {
    const m = new Map<string, CardModel>();
    for (const c of cards) {
      const id = c.attributes.tcgId;
      if (id && c.status === 'wishlist') m.set(id, c);
    }
    return m;
  }, [cards]);

  const ownedCountBySet = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) {
      if ((c.status ?? 'owned') === 'wishlist') continue;
      const s = c.attributes.set;
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return m;
  }, [cards]);

  const filteredSets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? sets.filter((s) => s.name.toLowerCase().includes(q)) : sets;
  }, [sets, search]);

  if (selected) {
    return <SetDetail set={selected} onBack={() => setSelected(null)} ownedByTcg={ownedByTcg} wishByTcg={wishByTcg} ownedCount={Math.min(ownedCountBySet.get(selected.name) ?? 0, selected.total)} />;
  }

  return (
    <Background>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header>
          <Eyebrow>POLARDEX</Eyebrow>
          <Title>Sets</Title>
          <Glass radius={14} intensity={26} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginTop: 12, height: 44 }}>
            <SymbolView name="magnifyingglass" tintColor={theme.color.text.secondary} size={16} />
            <SearchInput value={search} onChangeText={setSearch} placeholder="Search sets" placeholderTextColor={theme.color.text.tertiary} autoCorrect={false} />
          </Glass>
        </Header>

        {sets.length === 0 ? (
          <Centered><ActivityIndicator /><LoadingText>Loading sets…</LoadingText></Centered>
        ) : (
          <FlatList
            data={filteredSets}
            keyExtractor={(s) => s.id}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 130, gap: 12 }}
            renderItem={({ item, index }) => {
              const owned = Math.min(ownedCountBySet.get(item.name) ?? 0, item.total);
              const pct = item.total ? owned / item.total : 0;
              const complete = owned >= item.total && item.total > 0;
              return (
                <Animated.View entering={FadeInDown.delay((index % 10) * 40).springify().damping(16)}>
                  <Pressable onPress={() => { Haptics.selectionAsync(); setSelected(item); }} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                    <Glass radius={18} intensity={32} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <LogoWrap>
                        {item.images?.logo ? (
                          <Image source={{ uri: item.images.logo }} style={{ width: 56, height: 44 }} contentFit="contain" />
                        ) : <SymbolView name="rectangle.stack" tintColor={theme.color.text.secondary} size={28} />}
                      </LogoWrap>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <SetName numberOfLines={1}>{item.name}</SetName>
                          {complete && <SymbolView name="checkmark.seal.fill" tintColor={theme.accent} size={16} />}
                        </View>
                        <SetSeries numberOfLines={1}>{item.series}</SetSeries>
                        <View style={{ marginTop: 10 }}>
                          <Progress value={pct} />
                          <ProgressMeta>{owned} / {item.total} · {Math.round(pct * 100)}%</ProgressMeta>
                        </View>
                      </View>
                    </Glass>
                  </Pressable>
                </Animated.View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Background>
  );
}

function SetDetail({ set, onBack, ownedByTcg, wishByTcg, ownedCount }: {
  set: TcgSet; onBack: () => void;
  ownedByTcg: Map<string, CardModel>; wishByTcg: Map<string, CardModel>;
  ownedCount: number;
}) {
  const theme = useTheme();
  const { cards: setCards, loading } = useSetCards(set.id);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ViewFilter>('all');
  const [selectedTcg, setSelectedTcg] = useState<TcgCard | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return setCards.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (filter === 'owned' && !ownedByTcg.has(c.id)) return false;
      if (filter === 'missing' && ownedByTcg.has(c.id)) return false;
      return true;
    });
  }, [setCards, search, filter, ownedByTcg]);

  const openCard = (c: TcgCard) => {
    Haptics.selectionAsync();
    setSelectedTcg(c);
    sheetRef.current?.present();
  };

  const pct = set.total ? ownedCount / set.total : 0;

  return (
    <Background>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <DetailHeader>
          <BackBtn onPress={onBack}>
            <SymbolView name="chevron.left" tintColor={theme.color.text.primary} size={18} />
            <BackText>Sets</BackText>
          </BackBtn>
          <Title numberOfLines={1}>{set.name}</Title>
          <View style={{ marginTop: 10 }}>
            <Progress value={pct} height={7} />
            <ProgressMeta>{ownedCount} / {set.total} collected · {Math.round(pct * 100)}%</ProgressMeta>
          </View>

          <Glass radius={14} intensity={26} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginTop: 14, height: 42 }}>
            <SymbolView name="magnifyingglass" tintColor={theme.color.text.secondary} size={15} />
            <SearchInput value={search} onChangeText={setSearch} placeholder="Search this set" placeholderTextColor={theme.color.text.tertiary} autoCorrect={false} />
          </Glass>

          <Segmented>
            {(['all', 'owned', 'missing'] as ViewFilter[]).map((f) => (
              <Pressable key={f} style={{ flex: 1 }} onPress={() => { Haptics.selectionAsync(); setFilter(f); }}>
                <Segment $active={filter === f}>
                  <SegmentText $active={filter === f}>{f === 'all' ? 'All' : f === 'owned' ? 'Owned' : 'Missing'}</SegmentText>
                </Segment>
              </Pressable>
            ))}
          </Segmented>
        </DetailHeader>

        {loading && setCards.length === 0 ? (
          <Centered><ActivityIndicator /><LoadingText>Loading cards…</LoadingText></Centered>
        ) : (
          <FlatList
            data={displayed}
            keyExtractor={(c) => c.id}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 130 }}
            columnWrapperStyle={{ gap: 8 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={<Centered style={{ paddingTop: 60 }}><LoadingText>{search ? 'No matches' : filter === 'owned' ? 'None owned yet' : 'Nothing here'}</LoadingText></Centered>}
            renderItem={({ item }) => {
              const owned = ownedByTcg.get(item.id);
              const wished = wishByTcg.get(item.id);
              return (
                <View style={{ flex: 1 / 3 }}>
                  <Animated.View entering={FadeIn}>
                    <Pressable onPress={() => openCard(item)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                      <CardWrap style={{ borderColor: owned ? theme.accent : 'transparent' }}>
                        <Image source={{ uri: item.images.small }} style={{ width: '100%', aspectRatio: 0.72, opacity: owned ? 1 : 0.9 }} contentFit="contain" />
                        {owned && <Badge><SymbolView name="checkmark" tintColor={theme.dark ? '#1b2027' : '#fff'} size={9} /></Badge>}
                        {!owned && wished && <Badge style={{ backgroundColor: theme.color.aurora.red }}><SymbolView name="heart.fill" tintColor="#fff" size={9} /></Badge>}
                        {owned && (owned.quantity ?? 1) > 1 && <QtyTag><QtyTagText>×{owned.quantity}</QtyTagText></QtyTag>}
                      </CardWrap>
                    </Pressable>
                  </Animated.View>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>

      <SetCardSheet ref={sheetRef} card={selectedTcg} owned={selectedTcg ? ownedByTcg.get(selectedTcg.id) ?? null : null} wished={selectedTcg ? wishByTcg.get(selectedTcg.id) ?? null : null} />
    </Background>
  );
}

const Header = styled.View`
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[3]}px;
`;
const DetailHeader = styled.View`
  padding: ${({ theme }) => theme.space[2]}px ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[3]}px;
`;
const BackBtn = styled(Pressable)`
  flex-direction: row;
  align-items: center;
  gap: 2px;
  margin-bottom: ${({ theme }) => theme.space[2]}px;
`;
const BackText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.md}px;
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
  font-size: ${({ theme }) => theme.fontSize.xxl}px;
`;
const SearchInput = styled(TextInput)`
  flex: 1;
  margin-left: ${({ theme }) => theme.space[2]}px;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const LogoWrap = styled.View`
  width: 64px;
  height: 56px;
  align-items: center;
  justify-content: center;
`;
const SetName = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const SetSeries = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  margin-top: 1px;
`;
const ProgressMeta = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const Segmented = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[3]}px;
`;
const Segment = styled.View<{ $active: boolean }>`
  align-items: center;
  padding: 9px 0;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ theme, $active }) => ($active ? theme.accent : theme.glass.fill)};
  border-width: 1px;
  border-color: ${({ theme, $active }) => ($active ? 'transparent' : theme.glass.border)};
`;
const SegmentText = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) => ($active ? (theme.dark ? '#1b2027' : '#fff') : theme.color.text.secondary)};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;
const CardWrap = styled.View`
  border-width: 2px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  overflow: hidden;
`;
const Badge = styled.View`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background-color: ${({ theme }) => theme.accent};
  align-items: center;
  justify-content: center;
`;
const QtyTag = styled.View`
  position: absolute;
  bottom: 4px;
  left: 4px;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radius.full}px;
  background-color: rgba(0, 0, 0, 0.6);
`;
const QtyTagText = styled.Text`
  color: #fff;
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
`;
const Centered = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;
const LoadingText = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  margin-top: ${({ theme }) => theme.space[3]}px;
`;
