import type { useAnimate } from 'motion/react-mini';

type Animate = ReturnType<typeof useAnimate>[1];
type Controls = ReturnType<Animate>;

// Keyframes for the named parts of components/givto-logo.tsx (data-part=…). WAAPI has no
// repeat delay, so pauses are the flat stretches between `times`.

/** Loading: the box wiggles, the face blinks now and then. Loops until unmounted. */
export const loadingMoves = (animate: Animate, box: Element): Controls[] => [
  animate(
    box,
    { transform: ['rotate(0deg)', 'rotate(-8deg)', 'rotate(7deg)', 'rotate(-4deg)', 'rotate(0deg)', 'rotate(0deg)'] },
    { duration: 1.2, times: [0, 0.15, 0.3, 0.45, 0.6, 1], ease: 'easeInOut', repeat: Infinity }
  ),
  animate(
    '[data-part=eyes]',
    { transform: ['scaleY(1)', 'scaleY(1)', 'scaleY(0.1)', 'scaleY(1)'] },
    { duration: 2.4, times: [0, 0.9, 0.95, 1], repeat: Infinity }
  ),
];

/** Celebrate: the box jumps, the ribbon pops like a lid, a wink and a big smile. Twice, then rests. */
export const celebrateMoves = (animate: Animate, box: Element): Controls[] => [
  animate(
    box,
    { transform: ['translateY(0) rotate(0deg)', 'translateY(-14%) rotate(-6deg)', 'translateY(0) rotate(3deg)', 'translateY(0) rotate(0deg)'] },
    { duration: 0.9, times: [0, 0.35, 0.7, 1], ease: 'easeOut', repeat: 1 }
  ),
  animate(
    '[data-part=ribbon]',
    { transform: ['translateY(0)', 'translateY(-12%)', 'translateY(0)', 'translateY(0)'] },
    { duration: 0.9, times: [0, 0.35, 0.7, 1], ease: 'easeOut', repeat: 1 }
  ),
  animate(
    '[data-part=eyes]',
    { transform: ['scaleY(1)', 'scaleY(0.1)', 'scaleY(1)'] },
    { duration: 0.3, delay: 0.5, repeat: 1 }
  ),
  animate(
    '[data-part=mouth]',
    { transform: ['scale(1)', 'scale(1.35)', 'scale(1)'] },
    { duration: 0.9, ease: 'easeOut', repeat: 1 }
  ),
];
