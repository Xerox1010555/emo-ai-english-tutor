/**
 * Motion vocabulary and timing constants.
 *
 * Kept out of `motion.tsx` on purpose: that file must export components only so
 * React Fast Refresh works during development.
 *
 * Every duration and curve here is intentionally restrained — the interface
 * should feel smooth, not animated. Decorative motion is disabled globally
 * under prefers-reduced-motion (see index.css).
 */

import type { Transition, Variants } from 'framer-motion';

export const EASE = [0.16, 1, 0.3, 1] as const;

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 32,
  mass: 0.8,
};

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 30,
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
};

export const modalTransition: Transition = { duration: 0.24, ease: EASE };
