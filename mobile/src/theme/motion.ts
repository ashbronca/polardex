import { Easing, Keyframe } from 'react-native-reanimated';

/**
 * Motion intent:
 *  - SoftReveal / CALM  → content appearing (screens, grids, sections). Eased,
 *    no bounce — calm and intentional.
 *  - springs            → reserved for tactile feedback (press, add, fill).
 *  - linear loops       → ambient (spinners, shimmer).
 */

// Calm content reveal: gentle fade + a touch of rise, eased — no scale (which
// reads as a "bounce"/settle). Deliberately understated.
export const SoftReveal = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 6 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
});

export const CALM = Easing.out(Easing.cubic);
