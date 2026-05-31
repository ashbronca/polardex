import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'styled-components/native';

/**
 * Full-screen immersive gradient backdrop with a soft accent glow — the canvas
 * the frosted glass surfaces float over.
 */
export function Background({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
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
