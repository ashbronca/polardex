import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from 'styled-components/native';

/**
 * A frosted "liquid glass" surface — a blur of whatever's behind it, with a hair
 * border and a faint fill to lift it off the background.
 */
export function Glass({
  children,
  intensity = 40,
  radius,
  style,
}: {
  children?: ReactNode;
  intensity?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <BlurView
      intensity={intensity}
      tint={theme.glass.tint}
      style={[
        {
          borderRadius: radius ?? theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.glass.border,
          backgroundColor: theme.glass.fill,
          overflow: 'hidden',
        },
        style,
      ]}>
      {children}
    </BlurView>
  );
}
