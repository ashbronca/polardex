import { forwardRef, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from './Glass';
import { usePokedex, searchPokedex, PokedexEntry } from '@/api/pokedex';
import { useTcgSets, fetchCardsByNameAndSet } from '@/api/tcgApi';
import { TcgCard, pickPrice } from '@/services/tcg';
import { saveCard, generateCardId } from '@/api/mutations';
import { CardModel } from '@/api/types';

const CONDITIONS = ['Near Mint', 'Mint', 'Good', 'Played'];

export const AddCardSheet = forwardRef<BottomSheetModal, { onAdded?: () => void }>(
  function AddCardSheet({ onAdded }, ref) {
    const theme = useTheme();
    const { list: pokedex } = usePokedex();
    const { sets } = useTcgSets();

    const [name, setName] = useState('');
    const [pokemon, setPokemon] = useState<PokedexEntry | null>(null);
    const [setQuery, setSetQuery] = useState('');
    const [setName, setSetName] = useState<string | null>(null);

    const [matches, setMatches] = useState<TcgCard[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [chosen, setChosen] = useState<TcgCard | null>(null);

    const [quantity, setQuantity] = useState(1);
    const [status, setStatus] = useState<'owned' | 'wishlist'>('owned');
    const [condition, setCondition] = useState('Near Mint');
    const [alternate, setAlternate] = useState(false);
    const [saving, setSaving] = useState(false);

    const nameSuggestions = useMemo(
      () => (pokemon && pokemon.displayName === name ? [] : searchPokedex(pokedex, name)),
      [pokedex, name, pokemon],
    );
    const setSuggestions = useMemo(() => {
      if (setName && setName === setQuery) return [];
      const q = setQuery.trim().toLowerCase();
      if (!q) return [];
      return sets.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
    }, [sets, setQuery, setName]);

    // Once a name + set are chosen, fetch the matching TCG cards to pick exact art.
    useEffect(() => {
      if (!pokemon || !setName) { setMatches([]); setChosen(null); return; }
      let cancelled = false;
      setMatchesLoading(true);
      fetchCardsByNameAndSet(pokemon.displayName, setName).then((cards) => {
        if (cancelled) return;
        setMatches(cards);
        setChosen(cards[0] ?? null);
        setMatchesLoading(false);
      });
      return () => { cancelled = true; };
    }, [pokemon, setName]);

    const reset = () => {
      setName(''); setPokemon(null); setSetQuery(''); setSetName(null);
      setMatches([]); setChosen(null); setQuantity(1); setStatus('owned');
      setCondition('Near Mint'); setAlternate(false);
    };

    const canSave = !!pokemon && !!setName && !saving;

    const onSave = async () => {
      if (!pokemon || !setName) return;
      setSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const card: CardModel = {
        cardId: generateCardId(),
        quantity,
        setNumber: chosen ? Number(chosen.number) || 0 : 0,
        status,
        attributes: {
          cardType: alternate ? 'Alternate' : 'Standard',
          set: setName,
          rarity: chosen?.rarity ?? '',
          condition,
          grading: 0,
          tcgId: chosen?.id,
          tcgImageUrl: chosen?.images.large ?? chosen?.images.small,
          marketPrice: chosen ? pickPrice(chosen) : undefined,
          variants: { normal: !alternate || true, alternate },
        },
        pokemonData: {
          name: pokemon.displayName,
          id: pokemon.id,
          type: chosen?.types?.[0] ?? '',
          imageUrl: chosen?.images.large ?? pokemon.spriteUrl,
          evolutions: { first: { name: '', imageUrl: '' } },
        },
      };
      try {
        await saveCard(card);
        reset();
        onAdded?.();
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      } finally {
        setSaving(false);
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['92%']}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        handleIndicatorStyle={{ backgroundColor: theme.color.text.tertiary, width: 44 }}
        backgroundComponent={({ style }) => (
          <BlurView intensity={70} tint={theme.glass.tint} style={[style, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: theme.glass.border }]} />
        )}
        backdropComponent={(props: BottomSheetBackdropProps) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} />
        )}>
        <BottomSheetScrollView contentContainerStyle={{ padding: 22, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <SheetTitle>Add a card</SheetTitle>

          {/* Pokémon name */}
          <Label>Pokémon</Label>
          <Field>
            <Input
              value={name}
              onChangeText={(t) => { setName(t); setPokemon(null); }}
              placeholder="Search a Pokémon"
              placeholderTextColor={theme.color.text.tertiary}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </Field>
          {nameSuggestions.map((p) => (
            <Suggestion key={p.id} onPress={() => { setPokemon(p); setName(p.displayName); }}>
              <Image source={{ uri: p.spriteUrl }} style={{ width: 32, height: 32 }} contentFit="contain" />
              <SuggestionText>{p.displayName}</SuggestionText>
            </Suggestion>
          ))}

          {/* Set */}
          <Label>Set</Label>
          <Field>
            <Input
              value={setQuery}
              onChangeText={(t) => { setSetQuery(t); setSetName(null); }}
              placeholder="Search a set"
              placeholderTextColor={theme.color.text.tertiary}
              autoCorrect={false}
            />
          </Field>
          {setSuggestions.map((s) => (
            <Suggestion key={s.id} onPress={() => { setSetName(s.name); setSetQuery(s.name); }}>
              {s.images?.symbol ? (
                <Image source={{ uri: s.images.symbol }} style={{ width: 26, height: 26 }} contentFit="contain" />
              ) : <View style={{ width: 26 }} />}
              <SuggestionText>{s.name}</SuggestionText>
              <SuggestionMeta>{s.series}</SuggestionMeta>
            </Suggestion>
          ))}

          {/* Matching TCG cards */}
          {pokemon && setName && (
            <>
              <Label>Which card?</Label>
              {matchesLoading ? (
                <ActivityIndicator style={{ marginVertical: 12 }} />
              ) : matches.length === 0 ? (
                <Muted>No exact match — we&apos;ll use the sprite.</Muted>
              ) : (
                <Rail horizontal showsHorizontalScrollIndicator={false}>
                  {matches.map((c) => {
                    const sel = chosen?.id === c.id;
                    return (
                      <Pressable key={c.id} onPress={() => { Haptics.selectionAsync(); setChosen(c); }}>
                        <CardThumb $sel={sel} style={{ borderColor: sel ? theme.accent : 'transparent' }}>
                          <Image source={{ uri: c.images.small }} style={{ width: 84, height: 117 }} contentFit="contain" />
                        </CardThumb>
                        <ThumbNo>#{c.number}</ThumbNo>
                      </Pressable>
                    );
                  })}
                </Rail>
              )}
            </>
          )}

          {/* Quick fields */}
          <Label>Quantity</Label>
          <Row>
            <Stepper onPress={() => setQuantity((q) => Math.max(1, q - 1))}><StepperText>−</StepperText></Stepper>
            <QtyValue>{quantity}</QtyValue>
            <Stepper onPress={() => setQuantity((q) => q + 1)}><StepperText>+</StepperText></Stepper>
          </Row>

          <Label>Status</Label>
          <Chips>
            {(['owned', 'wishlist'] as const).map((s) => (
              <Chip key={s} $active={status === s} onPress={() => { Haptics.selectionAsync(); setStatus(s); }}>
                <ChipText $active={status === s}>{s === 'owned' ? 'Owned' : 'Wishlist'}</ChipText>
              </Chip>
            ))}
          </Chips>

          <Label>Condition</Label>
          <Chips>
            {CONDITIONS.map((c) => (
              <Chip key={c} $active={condition === c} onPress={() => { Haptics.selectionAsync(); setCondition(c); }}>
                <ChipText $active={condition === c}>{c}</ChipText>
              </Chip>
            ))}
          </Chips>

          <Label>Variant</Label>
          <Chips>
            <Chip $active={!alternate} onPress={() => { Haptics.selectionAsync(); setAlternate(false); }}>
              <ChipText $active={!alternate}>Normal</ChipText>
            </Chip>
            <Chip $active={alternate} onPress={() => { Haptics.selectionAsync(); setAlternate(true); }}>
              <ChipText $active={alternate}>Alternate</ChipText>
            </Chip>
          </Chips>

          <SaveBtn disabled={!canSave} onPress={onSave} style={{ opacity: canSave ? 1 : 0.5 }}>
            {saving ? <ActivityIndicator color="#1b2027" /> : <SaveText>Add to collection</SaveText>}
          </SaveBtn>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const SheetTitle = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xxl}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const Label = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: ${({ theme }) => theme.space[5]}px;
  margin-bottom: ${({ theme }) => theme.space[2]}px;
`;
const Field = styled.View`
  background-color: ${({ theme }) => theme.glass.fill};
  border-width: 1px;
  border-color: ${({ theme }) => theme.glass.border};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: 0 14px;
  height: 48px;
  justify-content: center;
`;
const Input = styled(BottomSheetTextInput)`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const Suggestion = styled(Pressable)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: 10px 8px;
`;
const SuggestionText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.md}px;
  flex: 1;
`;
const SuggestionMeta = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
`;
const Muted = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const Rail = styled(BottomSheetScrollView)`
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const CardThumb = styled.View<{ $sel: boolean }>`
  border-width: 2px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: 3px;
  margin-right: ${({ theme }) => theme.space[2]}px;
`;
const ThumbNo = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  text-align: center;
`;
const Row = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const Stepper = styled(Pressable)`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ theme }) => theme.glass.fill};
  border-width: 1px;
  border-color: ${({ theme }) => theme.glass.border};
`;
const StepperText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.xl}px;
`;
const QtyValue = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.xl}px;
  min-width: 28px;
  text-align: center;
`;
const Chips = styled.View`
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
  color: ${({ theme, $active }) => ($active ? (theme.dark ? '#1b2027' : '#ffffff') : theme.color.text.secondary)};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;
const SaveBtn = styled(Pressable)`
  margin-top: ${({ theme }) => theme.space[8]}px;
  height: 54px;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  background-color: ${({ theme }) => theme.accent};
  align-items: center;
  justify-content: center;
`;
const SaveText = styled.Text`
  color: ${({ theme }) => (theme.dark ? '#1b2027' : '#ffffff')};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
