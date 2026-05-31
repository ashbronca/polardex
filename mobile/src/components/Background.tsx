import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';

/**
 * Per-screen canvas. The immersive gradient lives at the root (see _layout) so
 * it's persistent and never reveals black on a slow mount; this just adds the
 * soft accent glow over it and hosts the screen content.
 */
export function Background({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.root}>
      {/* Soft ambient glow, top-right */}
      <View
        pointerEvents="none"
        style={[styles.glow, { backgroundColor: theme.accent, opacity: theme.dark ? 0.22 : 0.3 }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glow: {
    position: 'absolute',
    top: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 360,
  },
});
