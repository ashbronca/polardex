import { forwardRef } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from './Glass';
import { CardModel } from '@/api/types';

const imgUrl = (c: CardModel) => c.attributes.tcgImageUrl || c.pokemonData.imageUrl || '';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Glass radius={14} intensity={26} style={{ paddingVertical: 8, paddingHorizontal: 14, minWidth: 72, alignItems: 'center' }}>
      <StatValue numberOfLines={1}>{value}</StatValue>
      <StatLabel>{label}</StatLabel>
    </Glass>
  );
}

export const CardDetailSheet = forwardRef<BottomSheetModal, { card: CardModel | null }>(
  function CardDetailSheet({ card }, ref) {
    const theme = useTheme();
    const a = card?.attributes;

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['82%']}
        enableDynamicSizing={false}
        handleIndicatorStyle={{ backgroundColor: theme.color.text.tertiary, width: 44 }}
        backgroundComponent={({ style }) => (
          <BlurView
            intensity={70}
            tint={theme.glass.tint}
            style={[style, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: theme.glass.border }]}
          />
        )}
        backdropComponent={(props: BottomSheetBackdropProps) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} />
        )}>
        <BottomSheetView style={{ paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' }}>
          {card && a && (
            <>
              <HeroImage source={{ uri: imgUrl(card) }} contentFit="contain" transition={150} />
              <Name numberOfLines={2}>{card.pokemonData.name}</Name>
              <Subtitle numberOfLines={1}>
                {a.set}{card.pokemonData.type ? ` · ${card.pokemonData.type}` : ''}
              </Subtitle>

              <StatRow>
                <Stat label="Qty" value={String(card.quantity ?? 1)} />
                {!!a.rarity && <Stat label="Rarity" value={a.rarity} />}
                {!!a.condition && <Stat label="Condition" value={a.condition} />}
                {a.marketPrice != null && a.marketPrice > 0 && (
                  <Stat label="Market" value={`$${a.marketPrice.toFixed(2)}`} />
                )}
              </StatRow>

              {!!card.notes && (
                <Glass radius={16} intensity={24} style={{ marginTop: 18, padding: 16, alignSelf: 'stretch' }}>
                  <NotesLabel>Notes</NotesLabel>
                  <Notes>{card.notes}</Notes>
                </Glass>
              )}
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const HeroImage = styled(Image)`
  width: 64%;
  aspect-ratio: 0.72;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
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

const StatRow = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[5]}px;
`;

const StatValue = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;

const StatLabel = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const NotesLabel = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  letter-spacing: 1px;
  margin-bottom: ${({ theme }) => theme.space[1]}px;
`;

const Notes = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  line-height: 20px;
`;
