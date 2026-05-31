import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';

import { PROGRESS } from '@/theme/motion';

/**
 * Slim glass progress bar; `value` is 0–1. The fill springs to its value on
 * appear and whenever it changes (e.g. when you add a card), so it feels alive.
 */
export function Progress({ value, height = 6 }: { value: number; height?: number }) {
  const theme = useTheme();
  const w = useSharedValue(0);

  useEffect(() => {
    w.value = withSpring(Math.max(0, Math.min(1, value || 0)), PROGRESS);
  }, [value, w]);

  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <View style={{ height, borderRadius: height, backgroundColor: theme.glass.fill, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: theme.accent, borderRadius: height }, fill]} />
    </View>
  );
}
