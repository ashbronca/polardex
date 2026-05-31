import { useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';

export const PULL_THRESHOLD = 78;

/**
 * Frosted pull-to-refresh indicator. Fades/scales/rotates in as you pull past
 * the top, then spins while refreshing. Positioned absolutely over the top of
 * the list; pair with <RefreshSpacer> so content makes room during a refresh.
 */
export function GlassRefreshIndicator({
  scrollY,
  refreshing,
}: {
  scrollY: SharedValue<number>;
  refreshing: boolean;
}) {
  const theme = useTheme();
  const spin = useSharedValue(0);
  const active = useSharedValue(0);

  useEffect(() => {
    active.value = withTiming(refreshing ? 1 : 0, { duration: 200 });
    if (refreshing) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(360, { duration: 850, easing: Easing.linear }), -1, false);
    }
  }, [refreshing, spin, active]);

  const style = useAnimatedStyle(() => {
    const pull = Math.max(0, -scrollY.value);
    const p = Math.min(1, pull / PULL_THRESHOLD);
    const visible = Math.max(p, active.value);
    const rotate = active.value > 0.5 ? spin.value : p * 230;
    return {
      opacity: visible,
      transform: [{ scale: 0.55 + 0.45 * visible }, { rotate: `${rotate}deg` }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', zIndex: 5 }]}>
      <Animated.View style={style}>
        <BlurView
          intensity={40}
          tint={theme.glass.tint}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.glass.border, overflow: 'hidden' }}>
          <SymbolView name="arrow.clockwise" tintColor={theme.accent} size={18} />
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
}

/** Animated spacer that opens up while refreshing so content slides down. */
export function RefreshSpacer({ refreshing }: { refreshing: boolean }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withSpring(refreshing ? 56 : 0, { damping: 18, stiffness: 140 });
  }, [refreshing, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={style} />;
}
