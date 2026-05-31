import { View } from 'react-native';
import { useTheme } from 'styled-components/native';

/** Slim glass progress bar; `value` is 0–1. */
export function Progress({ value, height = 6 }: { value: number; height?: number }) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: theme.glass.fill, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: theme.accent, borderRadius: height }} />
    </View>
  );
}
