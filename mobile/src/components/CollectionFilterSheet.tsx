import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, { LinearTransition } from 'react-native-reanimated';
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
    selectedSets: string[];
    onToggleSet: (s: string) => void;
    onClearSets: () => void;
    onClearAll: () => void;
    active: boolean;
    sets: string[];
  }
>(function CollectionFilterSheet(
  { sort, onSort, selectedSets, onToggleSet, onClearSets, onClearAll, active, sets },
  ref,
) {
  const theme = useTheme();
  const tap = () => Haptics.selectionAsync();

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['62%']}
      enableDynamicSizing={false}
      handleIndicatorStyle={{ backgroundColor: theme.color.text.tertiary, width: 44 }}
      backgroundComponent={({ style }) => (
        <BlurView intensity={72} tint={theme.glass.tint} style={[style, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: theme.glass.border }]} />
      )}
      backdropComponent={(props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      )}>
      <BottomSheetScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <TitleRow>
          <SheetTitle>Sort & filter</SheetTitle>
          {active && (
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClearAll(); }}>
              <Clear>Clear all</Clear>
            </Pressable>
          )}
        </TitleRow>

        <Label>Sort by</Label>
        <Chips>
          {SORTS.map((s) => (
            <Chip key={s.key} $active={sort === s.key} onPress={() => { tap(); onSort(s.key); }}>
              <ChipText $active={sort === s.key}>{s.label}</ChipText>
            </Chip>
          ))}
        </Chips>

        <Label>Sets {selectedSets.length > 0 ? `· ${selectedSets.length}` : ''}</Label>
        <Animated.View layout={LinearTransition.springify().damping(18)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip $active={selectedSets.length === 0} onPress={() => { tap(); onClearSets(); }}>
            <ChipText $active={selectedSets.length === 0}>All sets</ChipText>
          </Chip>
          {sets.map((s) => {
            const on = selectedSets.includes(s);
            return (
              <Chip key={s} $active={on} onPress={() => { tap(); onToggleSet(s); }}>
                {on && <SymbolView name="checkmark" tintColor={theme.dark ? '#1b2027' : '#fff'} size={12} style={{ marginRight: 4 }} />}
                <ChipText $active={on}>{s}</ChipText>
              </Chip>
            );
          })}
        </Animated.View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const TitleRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;
const SheetTitle = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xxl}px;
`;
const Clear = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
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
  flex-direction: row;
  align-items: center;
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
