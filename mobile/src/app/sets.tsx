import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { useTcgSets, useSetCards } from '@/api/tcgApi';
import { TcgCard, TcgSet, pickPrice } from '@/services/tcg';
import { useCards } from '@/api/useCards';
import { saveCard, removeCard, generateCardId } from '@/api/mutations';
import { CardModel } from '@/api/types';

function tcgToCard(c: TcgCard, status: 'owned' | 'wishlist'): CardModel {
  return {
    cardId: generateCardId(),
    quantity: 1,
    setNumber: Number(c.number) || 0,
    status,
    attributes: {
      cardType: 'Standard',
      set: c.set.name,
      rarity: c.rarity ?? '',
      condition: 'Near Mint',
      grading: 0,
      tcgId: c.id,
      tcgImageUrl: c.images.large ?? c.images.small,
      marketPrice: pickPrice(c),
      variants: { normal: true, alternate: false },
    },
    pokemonData: {
      name: c.name,
      id: 0,
      type: c.types?.[0] ?? '',
      imageUrl: c.images.large ?? c.images.small,
      evolutions: { first: { name: '', imageUrl: '' } },
    },
  };
}

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

  const filteredSets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? sets.filter((s) => s.name.toLowerCase().includes(q)) : sets;
  }, [sets, search]);

  if (selected) {
    return <SetDetail set={selected} onBack={() => setSelected(null)} ownedByTcg={ownedByTcg} wishByTcg={wishByTcg} />;
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
            numColumns={2}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 130 }}
            columnWrapperStyle={{ gap: 12 }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay((index % 8) * 45).springify().damping(16)} style={{ flex: 1 }}>
                <Pressable onPress={() => { Haptics.selectionAsync(); setSelected(item); }} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                  <Glass radius={18} intensity={32} style={{ padding: 14, height: 120, justifyContent: 'center' }}>
                    {item.images?.logo ? (
                      <Image source={{ uri: item.images.logo }} style={{ width: '100%', height: 48 }} contentFit="contain" />
                    ) : (
                      <SetNameFallback numberOfLines={2}>{item.name}</SetNameFallback>
                    )}
                    <SetMeta numberOfLines={1}>{item.name}</SetMeta>
                  </Glass>
                </Pressable>
              </Animated.View>
            )}
          />
        )}
      </SafeAreaView>
    </Background>
  );
}

function SetDetail({ set, onBack, ownedByTcg, wishByTcg }: {
  set: TcgSet; onBack: () => void;
  ownedByTcg: Map<string, CardModel>; wishByTcg: Map<string, CardModel>;
}) {
  const theme = useTheme();
  const { cards: setCards, loading } = useSetCards(set.id);

  const addOwned = useCallback((c: TcgCard) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveCard(tcgToCard(c, 'owned'));
  }, []);
  const toggleWishlist = useCallback((c: TcgCard, existing?: CardModel) => {
    Haptics.selectionAsync();
    if (existing) removeCard(existing.cardId);
    else saveCard(tcgToCard(c, 'wishlist'));
  }, []);
  const changeQty = useCallback((owned: CardModel, delta: number) => {
    Haptics.selectionAsync();
    const next = (owned.quantity ?? 1) + delta;
    if (next <= 0) removeCard(owned.cardId);
    else saveCard({ ...owned, quantity: next });
  }, []);

  const ownedCount = useMemo(
    () => setCards.filter((c) => ownedByTcg.has(c.id)).length,
    [setCards, ownedByTcg],
  );

  return (
    <Background>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <DetailHeader>
          <BackBtn onPress={onBack}>
            <SymbolView name="chevron.left" tintColor={theme.color.text.primary} size={18} />
            <BackText>Sets</BackText>
          </BackBtn>
          <Title numberOfLines={1}>{set.name}</Title>
          <SetMeta>{ownedCount} / {set.total} collected</SetMeta>
        </DetailHeader>

        {loading && setCards.length === 0 ? (
          <Centered><ActivityIndicator /><LoadingText>Loading cards…</LoadingText></Centered>
        ) : (
          <FlatList
            data={setCards}
            keyExtractor={(c) => c.id}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 130 }}
            columnWrapperStyle={{ gap: 8 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => {
              const owned = ownedByTcg.get(item.id);
              const wished = wishByTcg.get(item.id);
              return (
                <View style={{ flex: 1 / 3, paddingHorizontal: 0 }}>
                  <Animated.View entering={FadeIn}>
                    <Pressable onPress={() => (owned ? changeQty(owned, 1) : addOwned(item))}>
                      <CardWrap $owned={!!owned} style={{ borderColor: owned ? theme.accent : 'transparent' }}>
                        <Image source={{ uri: item.images.small }} style={{ width: '100%', aspectRatio: 0.72, opacity: owned ? 1 : 0.92 }} contentFit="contain" />
                        {owned && <OwnedDot><SymbolView name="checkmark" tintColor={theme.dark ? '#1b2027' : '#fff'} size={9} /></OwnedDot>}
                      </CardWrap>
                    </Pressable>
                    {owned ? (
                      <QtyRow>
                        <MiniBtn onPress={() => changeQty(owned, -1)}><MiniText>−</MiniText></MiniBtn>
                        <QtyNum>{owned.quantity ?? 1}</QtyNum>
                        <MiniBtn onPress={() => changeQty(owned, 1)}><MiniText>+</MiniText></MiniBtn>
                      </QtyRow>
                    ) : (
                      <Pressable onPress={() => toggleWishlist(item, wished)} style={{ alignItems: 'center', paddingVertical: 4 }}>
                        <SymbolView name={wished ? 'heart.fill' : 'heart'} tintColor={wished ? theme.color.aurora.red : theme.color.text.secondary} size={14} />
                      </Pressable>
                    )}
                  </Animated.View>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
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
const SetNameFallback = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  text-align: center;
`;
const SetMeta = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  text-align: center;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const CardWrap = styled.View<{ $owned: boolean }>`
  border-width: 2px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  overflow: hidden;
`;
const OwnedDot = styled.View`
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
const QtyRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]}px;
  padding-top: 4px;
`;
const MiniBtn = styled(Pressable)`
  width: 26px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  background-color: ${({ theme }) => theme.glass.fill};
  border-width: 1px;
  border-color: ${({ theme }) => theme.glass.border};
`;
const MiniText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const QtyNum = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  min-width: 16px;
  text-align: center;
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
