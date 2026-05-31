import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';

/**
 * Two slow, drifting accent glows of different hues behind the frosted glass —
 * gives the background quiet depth and life without ever drawing attention.
 * Deliberately subtle.
 */
export function AmbientGlow() {
  const theme = useTheme();
  const a = useSharedValue(0);
  const b = useSharedValue(0);

  useEffect(() => {
    a.value = withRepeat(withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.sin) }), -1, true);
    b.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [a, b]);

  const styleA = useAnimatedStyle(() => ({
    opacity: (theme.dark ? 0.15 : 0.22) + a.value * 0.07,
    transform: [{ translateX: -36 + a.value * 72 }, { translateY: -24 + a.value * 44 }, { scale: 1 + a.value * 0.12 }],
  }));
  const styleB = useAnimatedStyle(() => ({
    opacity: (theme.dark ? 0.1 : 0.16) + (1 - b.value) * 0.06,
    transform: [{ translateX: 24 - b.value * 64 }, { translateY: 30 + b.value * 56 }, { scale: 1.1 - b.value * 0.1 }],
  }));

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.glowA, { backgroundColor: theme.accent }, styleA]} />
      <Animated.View pointerEvents="none" style={[styles.glowB, { backgroundColor: theme.color.frost.teal }, styleB]} />
    </>
  );
}

const styles = StyleSheet.create({
  glowA: { position: 'absolute', top: -150, right: -110, width: 380, height: 380, borderRadius: 380 },
  glowB: { position: 'absolute', bottom: -130, left: -110, width: 320, height: 320, borderRadius: 320 },
});
