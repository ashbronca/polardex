import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { ScanMatchCard } from '@/components/ScanMatchCard';
import { useCards } from '@/api/useCards';
import { parseScan, matchCard, ScanMatch, ParsedScan } from '@/api/scan';
import { recognizeText, isOcrAvailable } from '../../modules/expo-card-ocr';
import { CardModel } from '@/api/types';

// Used only in preview mode (Expo Go) to exercise the match card without OCR.
const PREVIEW_SAMPLES: ParsedScan[] = [
  { number: '4', printedTotal: 102, nameGuess: 'Charizard' },
  { number: '58', printedTotal: 198, nameGuess: 'Cetoddle' },
  { number: '25', printedTotal: 102, nameGuess: 'Pikachu' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <Background><SafeAreaView style={{ flex: 1 }} /></Background>;
  }
  if (!permission.granted) {
    return <PermissionGate onRequest={requestPermission} canAskAgain={permission.canAskAgain} />;
  }
  return <Scanner />;
}

function Scanner() {
  const theme = useTheme();
  const { cards } = useCards();

  const cameraRef = useRef<CameraView>(null);
  const focused = useRef(false);
  const ready = useRef(false);
  const chainRunning = useRef(false);
  const matchRef = useRef<ScanMatch | null>(null);

  const [match, setMatch] = useState<ScanMatch | null>(null);
  const [looking, setLooking] = useState(false);
  // Diagnostic readout (toggle by tapping the "Scan" title). On by default while
  // we dial the scanner in over TestFlight.
  const [debug, setDebug] = useState('');
  const [showDebug, setShowDebug] = useState(true);

  const ownedByTcg = useMemo(() => {
    const owned = new Map<string, CardModel>();
    for (const c of cards) {
      const id = c.attributes.tcgId;
      if (id && (c.status ?? 'owned') !== 'wishlist') owned.set(id, c);
    }
    return owned;
  }, [cards]);

  const simIdx = useRef(0);
  const simulate = useCallback(async () => {
    if (matchRef.current) return;
    Haptics.selectionAsync();
    const pick = PREVIEW_SAMPLES[simIdx.current % PREVIEW_SAMPLES.length];
    simIdx.current += 1;
    const m = await matchCard(pick);
    if (m) {
      matchRef.current = m;
      setMatch(m);
    }
  }, []);

  const runChain = useCallback(async () => {
    if (!isOcrAvailable) return; // preview mode — driven by tap-to-simulate
    if (chainRunning.current) return;
    chainRunning.current = true;
    while (focused.current && !matchRef.current) {
      const cam = cameraRef.current;
      if (!cam || !ready.current) {
        await sleep(200);
        continue;
      }
      try {
        // No skipProcessing — we need the photo rotated upright so Vision reads
        // the text the right way up.
        const photo = await cam.takePictureAsync({ quality: 0.5, shutterSound: false });
        if (!focused.current || matchRef.current) break;
        if (photo?.uri) {
          const lines = await recognizeText(photo.uri);
          const parsed = parseScan(lines);
          const raw = lines
            .slice(0, 4)
            .map((l) => l.text)
            .join(' | ');
          if (parsed.number || parsed.nameGuess) {
            setLooking(true);
            let m: ScanMatch | null = null;
            try {
              m = await matchCard(parsed);
            } finally {
              setLooking(false);
            }
            setDebug(
              `ocr ${lines.length} · n=${parsed.number ?? '–'} t=${parsed.printedTotal ?? '–'} nm=${parsed.nameGuess ?? '–'} · cand=${m?.candidates.length ?? 0}${m?.confident ? ' ✓' : ''}\n${raw}`,
            );
            if (m && m.confident && focused.current && !matchRef.current) {
              matchRef.current = m;
              setMatch(m);
              break;
            }
          } else {
            setDebug(`ocr ${lines.length} · no number/name\n${raw || '(no text)'}`);
          }
        }
      } catch (e) {
        setDebug(`err: ${String(e).slice(0, 80)}`);
      }
      await sleep(550);
    }
    setLooking(false);
    chainRunning.current = false;
  }, []);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      runChain();
      return () => {
        focused.current = false;
      };
    }, [runChain]),
  );

  const handleDismiss = useCallback(() => {
    matchRef.current = null;
    setMatch(null);
    runChain();
  }, [runChain]);

  // Sweeping scan line within the reticle (ambient, gentle loop).
  const sweep = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      sweep.value = 0;
      sweep.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true);
      return () => {};
    }, [sweep]),
  );
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value * (RETICLE_H - 2) }] }));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        animateShutter={false}
        onCameraReady={() => { ready.current = true; }}
      />

      <SafeAreaView edges={['top']} style={styles.header} pointerEvents="box-none">
        <Eyebrow>POLARDEX</Eyebrow>
        <Pressable onPress={() => setShowDebug((d) => !d)}>
          <Title>Scan</Title>
        </Pressable>
        <Hint>
          {match
            ? ' '
            : !isOcrAvailable
              ? 'Preview · tap the frame to simulate'
              : looking
                ? 'Identifying…'
                : 'Point at a card'}
        </Hint>
      </SafeAreaView>

      {!match && (
        <View style={styles.reticleWrap} pointerEvents={isOcrAvailable ? 'none' : 'box-none'}>
          <Pressable onPress={isOcrAvailable ? undefined : simulate} disabled={isOcrAvailable}>
            <Reticle style={{ borderColor: theme.glass.border }}>
              <Corner style={[styles.c, styles.tl, { borderColor: theme.accent }]} />
              <Corner style={[styles.c, styles.tr, { borderColor: theme.accent }]} />
              <Corner style={[styles.c, styles.bl, { borderColor: theme.accent }]} />
              <Corner style={[styles.c, styles.br, { borderColor: theme.accent }]} />
              <Animated.View style={[styles.sweep, { backgroundColor: theme.accent }, sweepStyle]} />
            </Reticle>
          </Pressable>
        </View>
      )}

      {showDebug && !match && !!debug && (
        <View style={styles.debug} pointerEvents="none">
          <DebugText>{debug}</DebugText>
        </View>
      )}

      <ScanMatchCard
        match={match}
        ownedByTcg={ownedByTcg}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

function PermissionGate({ onRequest, canAskAgain }: { onRequest: () => void; canAskAgain: boolean }) {
  const theme = useTheme();
  return (
    <Background>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Glass radius={999} intensity={40} style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <SymbolView name="camera.viewfinder" tintColor={theme.accent} size={52} />
        </Glass>
        <Title>Scan a card</Title>
        <Hint style={{ textAlign: 'center', maxWidth: 280, marginTop: 8 }}>
          Point your camera at a Pokémon card to identify it and add it to your collection in a tap.
        </Hint>
        <Pressable onPress={() => { Haptics.selectionAsync(); onRequest(); }} style={{ marginTop: 26 }}>
          <Glass radius={999} intensity={30} style={{ paddingVertical: 12, paddingHorizontal: 26 }}>
            <EnableText>{canAskAgain ? 'Enable camera' : 'Open Settings to enable'}</EnableText>
          </Glass>
        </Pressable>
      </SafeAreaView>
    </Background>
  );
}

const RETICLE_H = 300;

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 22, paddingTop: 6 },
  reticleWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  c: { position: 'absolute', width: 28, height: 28 },
  tl: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 18 },
  tr: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 18 },
  bl: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 18 },
  br: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 18 },
  sweep: { position: 'absolute', top: 0, left: 14, right: 14, height: 2, borderRadius: 2, opacity: 0.7 },
  debug: { position: 'absolute', bottom: 28, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
});

const Reticle = styled(View)`
  width: 215px;
  height: ${RETICLE_H}px;
  border-radius: 18px;
  border-width: 1px;
`;
const Corner = styled(View)``;
const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.xxs}px;
  letter-spacing: 2px;
`;
const Title = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xxxl}px;
`;
const Hint = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  margin-top: 2px;
`;
const EnableText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const DebugText = styled.Text`
  color: #d8f0ff;
  font-family: ${({ theme }) => theme.font.medium};
  font-size: 11px;
  line-height: 15px;
`;
