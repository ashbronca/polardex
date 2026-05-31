import { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

/**
 * Counts a number up from 0 to `value` (easeOutCubic) and renders it via
 * `format`. Isolated component so only this text re-renders each frame.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 750,
  style,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  style?: StyleProp<TextStyle>;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else { setDisplay(value); fromRef.current = value; }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <Text style={style}>{format(display)}</Text>;
}
