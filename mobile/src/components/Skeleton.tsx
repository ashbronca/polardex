import { useEffect } from 'react';
import { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';

/** A softly pulsing glass placeholder for loading states. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 12,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const o = useSharedValue(0.35);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.8, { duration: 850, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [o]);
  const theme = useTheme();
  const pulse = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: theme.glass.fill }, pulse, style]} />;
}
