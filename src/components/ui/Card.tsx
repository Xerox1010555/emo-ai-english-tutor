import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { springSnappy } from './motionTokens';
import { TiltCard } from './TiltCard';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  /**
   * Draws a gradient hairline around the panel — the "premium" treatment used
   * for hero and highlight cards.
   */
  hairline?: boolean;
  /**
   * Tilts the panel in 3D towards the pointer. Slightly more expensive, so it
   * is opt-in for the panels that deserve it.
   */
  tilt?: boolean;
  /** Depth of the stacked shadow: 1 (subtle) → 3 (dramatic). */
  depth?: 1 | 2 | 3;
}

/**
 * The app's surface primitive: a layered glass panel.
 *
 * Three ingredients make it read as glass rather than a translucent box:
 * a tinted gradient body, a blurred+saturated backdrop, and an inset specular
 * highlight along the top edge (see `.glass-panel` in index.css).
 */
export function Card({
  children,
  className = '',
  onClick,
  hover = false,
  hairline = false,
  tilt = false,
  depth = 2,
}: CardProps) {
  const interactive = Boolean(onClick) || hover;

  const base = hairline
    ? 'glass-hairline rounded-2xl p-5 shadow-glass relative overflow-hidden'
    : 'glass-panel rounded-2xl p-5 relative overflow-hidden';

  const depthClass = `depth-${depth}`;

  const inner = (
    <>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </>
  );

  // The tilt comes BEFORE the "not interactive" shortcut: a hero card does
  // not need a click handler to deserve the 3D treatment.
  if (tilt) {
    return (
      <TiltCard
        onClick={onClick}
        className={`${base} ${depthClass} sheen w-full hover:border-white/[0.12] focus-visible:ring-2 focus-visible:ring-primary-500/60 ${className}`}
      >
        {inner}
      </TiltCard>
    );
  }

  if (!interactive) {
    return <div className={`${base} ${depthClass} ${className}`}>{children}</div>;
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={springSnappy}
      className={`${base} ${depthClass} sheen text-left w-full hover:border-white/[0.12] focus-visible:ring-2 focus-visible:ring-primary-500/60 ${className}`}
    >
      {inner}
    </motion.button>
  );
}
