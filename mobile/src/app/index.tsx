import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { useCards } from '@/api/useCards';
import { CardModel } from '@/api/types';

const imgUrl = (c: CardModel) => c.attributes.tcgImageUrl || c.pokemonData.imageUrl || '';

export default function CollectionScreen() {
  const { cards, loading, error } = useCards();
  const owned = useMemo(
    () => cards.filter((c) => (c.status ?? 'owned') !== 'wishlist'),
    [cards],
  );

  return (
    <Background>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header>
          <Eyebrow>POLARDEX</Eyebrow>
          <Row>
            <Title>Collection</Title>
            {!loading && (
              <Glass radius={999} intensity={30} style={{ paddingVertical: 4, paddingHorizontal: 12 }}>
                <CountText>{owned.length}</CountText>
              </Glass>
            )}
          </Row>
        </Header>

        {error ? (
          <Centered>
            <Muted>{error}</Muted>
          </Centered>
        ) : loading ? (
          <Centered>
            <ActivityIndicator />
          </Centered>
        ) : (
          <FlatList
            data={owned}
            keyExtractor={(c) => c.cardId}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 130 }}
            columnWrapperStyle={{ gap: 12 }}
            ItemSeparatorComponent={() => <Gap />}
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.delay((index % 8) * 55).springify().damping(16).mass(0.85)}
                style={{ flex: 1 }}>
                <Pressable
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                  <Glass radius={18} intensity={36} style={{ padding: 8 }}>
                    <CardArt source={{ uri: imgUrl(item) }} contentFit="contain" transition={180} />
                    <Name numberOfLines={1}>{item.pokemonData.name}</Name>
                    <SetLabel numberOfLines={1}>{item.attributes.set}</SetLabel>
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

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xxxl}px;
`;

const CountText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
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
