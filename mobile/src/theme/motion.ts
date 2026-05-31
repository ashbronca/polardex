import { Easing, Keyframe } from 'react-native-reanimated';

/**
 * Motion intent:
 *  - SoftReveal / CALM  → content appearing (screens, grids, sections). Eased,
 *    no bounce — calm and intentional.
 *  - springs            → reserved for tactile feedback (press, add, fill).
 *  - linear loops       → ambient (spinners, shimmer).
 */

// Calm content reveal: gentle fade + slight rise + micro-scale, eased.
export const SoftReveal = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.985 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: Easing.out(Easing.cubic) },
});

export const CALM = Easing.out(Easing.cubic);
