import { Easing } from 'react-native-reanimated';

/**
 * Shared motion language. Reach for these instead of inlining spring/easing
 * configs so the whole app moves with one voice.
 *
 *  - CALM (eased)   → content appearing: screens, grids, sections. No bounce.
 *  - PRESS springs  → tactile feedback on touch.
 *  - SETTLE spring  → fills / sheets coming to rest: present, not bouncy.
 *  - HERO_PULSE     → one-off delight bloom on first add.
 *  - linear loops   → ambient (spinners, sweeps, glows).
 */

/** Calm content reveal — gentle, eased, no overshoot. */
export const CALM = Easing.out(Easing.cubic);

/** Standard reveal duration for eased entrances. */
export const REVEAL_MS = 280;

/** Tactile press feedback — crisp, tight, minimal overshoot. */
export const PRESS_IN = { damping: 18, stiffness: 420, mass: 0.4 } as const;
export const PRESS_OUT = { damping: 16, stiffness: 360, mass: 0.4 } as const;

/** Sheets/elements settling to rest — alive but understated (no visible bounce). */
export const SETTLE = { damping: 20, stiffness: 200, mass: 0.7 } as const;

/** Progress fills — a touch of playful spring/overshoot as the bar grows. */
export const PROGRESS = { damping: 13, stiffness: 130 } as const;

/** Two-stage delight bloom for a first add (scale up, then ease back). */
export const HERO_PULSE_UP = { damping: 9, stiffness: 200 } as const;
export const HERO_PULSE_DOWN = { damping: 13, stiffness: 160 } as const;
