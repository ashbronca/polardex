import { ReactNode, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

/**
 * Per-screen canvas over the persistent root gradient. Fades its content in
 * whenever the screen gains focus — a controlled reanimated animation (it always
 * completes), replacing the flaky native tab transition that occasionally left
 * a scene stuck invisible (the blank-page bug).
 */
export function Background({ children }: { children: ReactNode }) {
  const p = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      p.value = 0;
      p.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
    }, [p]),
  );

  // Pure fade — no slide. A whole-screen slide reads as harsh on quick nav.
  const style = useAnimatedStyle(() => ({ opacity: p.value }));

  return <Animated.View style={[styles.root, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
