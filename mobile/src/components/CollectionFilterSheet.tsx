import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import styled, { useTheme } from 'styled-components/native';

export type SortKey = 'recent' | 'priceHigh' | 'priceLow' | 'name';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently added' },
  { key: 'priceHigh', label: 'Price: high → low' },
  { key: 'priceLow', label: 'Price: low → high' },
  { key: 'name', label: 'Name A–Z' },
];

export const CollectionFilterSheet = forwardRef<
  BottomSheetModal,
  {
    sort: SortKey;
    onSort: (s: SortKey) => void;
    setFilter: string | null;
    onSetFilter: (s: string | null) => void;
    sets: string[];
  }
>(function CollectionFilterSheet({ sort, onSort, setFilter, onSetFilter, sets }, ref) {
  const theme = useTheme();
  const tap = () => Haptics.selectionAsync();

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['60%']}
      enableDynamicSizing={false}
      handleIndicatorStyle={{ backgroundColor: theme.color.text.tertiary, width: 44 }}
      backgroundComponent={({ style }) => (
        <BlurView intensity={72} tint={theme.glass.tint} style={[style, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: theme.glass.border }]} />
      )}
      backdropComponent={(props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      )}>
      <BottomSheetScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <SheetTitle>Sort & filter</SheetTitle>

        <Label>Sort by</Label>
        <Chips>
          {SORTS.map((s) => (
            <Chip key={s.key} $active={sort === s.key} onPress={() => { tap(); onSort(s.key); }}>
              <ChipText $active={sort === s.key}>{s.label}</ChipText>
            </Chip>
          ))}
        </Chips>

        <Label>Set</Label>
        <Chips>
          <Chip $active={!setFilter} onPress={() => { tap(); onSetFilter(null); }}>
            <ChipText $active={!setFilter}>All sets</ChipText>
          </Chip>
          {sets.map((s) => (
            <Chip key={s} $active={setFilter === s} onPress={() => { tap(); onSetFilter(s); }}>
              <ChipText $active={setFilter === s}>{s}</ChipText>
            </Chip>
          ))}
        </Chips>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const SheetTitle = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xxl}px;
  margin-bottom: ${({ theme }) => theme.space[2]}px;
`;
const Label = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: ${({ theme }) => theme.space[5]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const Chips = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Chip = styled(Pressable)<{ $active: boolean }>`
  padding: 9px 16px;
  border-radius: ${({ theme }) => theme.radius.full}px;
  background-color: ${({ theme, $active }) => ($active ? theme.accent : theme.glass.fill)};
  border-width: 1px;
  border-color: ${({ theme, $active }) => ($active ? 'transparent' : theme.glass.border)};
`;
const ChipText = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) => ($active ? (theme.dark ? '#1b2027' : '#fff') : theme.color.text.secondary)};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;
