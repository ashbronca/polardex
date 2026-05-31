import { useMemo } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import { useCards } from '@/api/useCards';
import { CardModel } from '@/api/types';

function imgUrl(card: CardModel): string {
  return card.attributes.tcgImageUrl || card.pokemonData.imageUrl || '';
}

export default function CollectionScreen() {
  const { cards, loading, error } = useCards();

  const owned = useMemo(
    () => cards.filter((c) => (c.status ?? 'owned') !== 'wishlist'),
    [cards],
  );

  return (
    <Screen edges={['top']}>
      <Header>
        <Title>Collection</Title>
        <Count>
          {loading ? 'Loading…' : `${owned.length} card${owned.length === 1 ? '' : 's'}`}
        </Count>
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
          contentContainerStyle={{ padding: 12, paddingBottom: 96 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <Gap />}
          renderItem={({ item }) => (
            <Tile>
              <CardArt source={{ uri: imgUrl(item) }} contentFit="contain" transition={150} />
              <Name numberOfLines={1}>{item.pokemonData.name}</Name>
              <SetLabel numberOfLines={1}>{item.attributes.set}</SetLabel>
            </Tile>
          )}
        />
      )}
    </Screen>
  );
}

const Screen = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.color.surface.base};
`;

const Header = styled.View`
  padding: ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[2]}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.fontSize.xxl}px;
  font-weight: ${({ theme }) => theme.fontWeight.heavy};
`;

const Count = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  margin-top: ${({ theme }) => theme.space[1]}px;
`;

const Tile = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.color.surface.muted};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  padding: ${({ theme }) => theme.space[2]}px;
`;

const CardArt = styled(Image)`
  width: 100%;
  aspect-ratio: 0.72;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ theme }) => theme.color.surface.subtle};
`;

const Name = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  margin-top: ${({ theme }) => theme.space[2]}px;
`;

const SetLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  margin-top: ${({ theme }) => theme.space[1]}px;
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
`;
