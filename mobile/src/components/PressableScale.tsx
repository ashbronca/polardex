import { Pressable, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable with a crisp tactile scale-down on press (a tight spring — quick,
 * minimal overshoot, distinct from the playful reveal bounces). Don't pass a
 * style function; the scale provides the press feedback.
 */
export function PressableScale({
  children,
  scaleTo = 0.95,
  style,
  ...props
}: PressableProps & { scaleTo?: number }) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 18, stiffness: 420, mass: 0.4 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 360, mass: 0.4 }); }}
      style={[aStyle, style as object]}
      {...props}>
      {children}
    </AnimatedPressable>
  );
}
