import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { springSnappy } from './motionTokens';

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
}: CardProps) {
  const interactive = Boolean(onClick) || hover;

  const base = hairline
    ? 'glass-hairline rounded-2xl p-5 shadow-glass relative overflow-hidden'
    : 'glass-panel rounded-2xl p-5 relative overflow-hidden';

  if (!interactive) {
    return <div className={`${base} ${className}`}>{children}</div>;
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={springSnappy}
      className={`${base} sheen text-left w-full hover:border-white/[0.12] focus-visible:ring-2 focus-visible:ring-primary-500/60 ${className}`}
    >
      {children}
    </motion.button>
  );
}
