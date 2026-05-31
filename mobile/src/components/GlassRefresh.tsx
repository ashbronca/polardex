import { useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';

export const PULL_THRESHOLD = 78;

/**
 * Frosted pull-to-refresh indicator. One continuous `angle` follows the pull,
 * then the spin continues from that exact angle (no jump on release). Pair with
 * <RefreshSpacer> so content makes room while refreshing.
 */
export function GlassRefreshIndicator({
  scrollY,
  refreshing,
}: {
  scrollY: SharedValue<number>;
  refreshing: boolean;
}) {
  const theme = useTheme();
  const angle = useSharedValue(0);
  const appear = useSharedValue(0); // animated presence (opacity/scale)
  const spinning = useSharedValue(0); // instant flag

  // While not refreshing, the angle tracks the pull distance directly.
  useAnimatedReaction(
    () => scrollY.value,
    (y) => {
      if (spinning.value === 1) return;
      const p = Math.min(1, Math.max(0, -y) / PULL_THRESHOLD);
      angle.value = p * 230;
    },
  );

  useEffect(() => {
    spinning.value = refreshing ? 1 : 0;
    appear.value = withTiming(refreshing ? 1 : 0, { duration: 220, easing: Easing.out(Easing.quad) });
    if (refreshing) {
      // Continue spinning from the current pull angle — repeats seamlessly
      // because +360 lands on a visually identical angle.
      const from = angle.value;
      angle.value = withRepeat(withTiming(from + 360, { duration: 850, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(angle);
    }
  }, [refreshing, angle, appear, spinning]);

  const style = useAnimatedStyle(() => {
    const pull = Math.max(0, -scrollY.value);
    const p = Math.min(1, pull / PULL_THRESHOLD);
    const visible = Math.max(p, appear.value);
    return {
      opacity: visible,
      transform: [{ scale: 0.55 + 0.45 * visible }, { rotate: `${angle.value}deg` }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', zIndex: 5 }}>
      <Animated.View style={style}>
        <BlurView
          intensity={42}
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
    // Eased (not spring) so the content doesn't bounce when the spacer collapses.
    h.value = withTiming(refreshing ? 56 : 0, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [refreshing, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={style} />;
}
