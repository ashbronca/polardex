import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Per-screen canvas. The immersive gradient lives at the root (see _layout) so
 * it's persistent and never reveals black on a slow mount; this just adds the
 * soft accent glow over it and hosts the screen content.
 */
export function Background({ children }: { children: ReactNode }) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
