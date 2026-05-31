import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';

import { Glass } from './Glass';
import { PressableScale } from './PressableScale';
import { useThemeMode, ThemeMode } from '@/theme/ThemeMode';
import { CALM } from '@/theme/motion';

const ICON = {
  system: 'circle.lefthalf.filled',
  light: 'sun.max.fill',
  dark: 'moon.stars.fill',
} as const satisfies Record<ThemeMode, string>;

/** Compact glass button that cycles system → light → dark with a spin + haptic. */
export function ThemeToggle() {
  const theme = useTheme();
  const { mode, cycle } = useThemeMode();
  const spin = useSharedValue(0);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  const onPress = () => {
    Haptics.selectionAsync();
    spin.value = withTiming(spin.value + 360, { duration: 520, easing: CALM });
    cycle();
  };

  return (
    <PressableScale onPress={onPress} scaleTo={0.9} accessibilityLabel={`Theme: ${mode}`}>
      <Glass radius={999} intensity={30} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={iconStyle}>
          <SymbolView name={ICON[mode]} tintColor={theme.accent} size={20} />
        </Animated.View>
      </Glass>
    </PressableScale>
  );
}
