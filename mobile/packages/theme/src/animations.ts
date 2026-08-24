export const ANIMATION = {
  screenEnter: { duration: 380, easing: [0.22, 0.9, 0.24, 1] },
  screenExit: { duration: 380, easing: [0.22, 0.9, 0.24, 1] },
  sheetEnter: { duration: 340, easing: [0.22, 0.9, 0.24, 1] },
  sheetExit: { duration: 300, easing: 'ease-out' as const },

  pressScale: 0.92,
  pressScaleCard: 0.97,
  pressScaleChip: 0.95,
  pressScaleBig: 0.95,
  pressScaleBtn: 0.98,
  pressDuration: 150,

  sosPulse: { duration: 2400, easing: 'ease-in-out' as const, loop: true },
  breathe: { duration: 2400, easing: 'ease-in-out' as const, loop: true },
  bob: { duration: 2200, easing: 'ease-in-out' as const, loop: true },

  shimmer: 1200,
  successPop: { duration: 450, easing: [0.2, 1.4, 0.4, 1] },
  progressFill: { duration: 1000, easing: [0.22, 0.9, 0.24, 1] },
  toastEnter: { duration: 350, easing: [0.22, 0.9, 0.24, 1] },
  toastExit: { duration: 350, easing: [0.22, 0.9, 0.24, 1] },

  spring: { speed: 50, bounciness: 4 },
  springFast: { speed: 70, bounciness: 4 },
  springSlow: { speed: 30, bounciness: 6 },

  durationFast: 200,
  durationNormal: 300,
  durationSlow: 500,

  pulse: { min: 0.3, max: 1, duration: 1200 },
  pulseFast: { min: 0.4, max: 1, duration: 800 },
  modal: { enter: 250, exit: 200 },
} as const;

export type AnimationToken = keyof typeof ANIMATION;

export const EASING = {
  standard: [0.22, 0.9, 0.24, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
  sharp: [0.4, 0, 0.6, 1],
} as const;
