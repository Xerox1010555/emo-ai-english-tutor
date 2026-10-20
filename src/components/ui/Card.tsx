import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { springSnappy } from './motionTokens';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className = '', onClick, hover = false }: CardProps) {
  const interactive = Boolean(onClick) || hover;

  const base =
    'glass rounded-2xl p-5 shadow-card relative transition-colors duration-200';

  if (!interactive) {
    return <div className={`${base} ${className}`}>{children}</div>;
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={springSnappy}
      className={`${base} text-left w-full hover:bg-white/[0.06] hover:border-white/[0.1] focus-visible:ring-2 focus-visible:ring-primary-500/60 ${className}`}
    >
      {children}
    </motion.button>
  );
}
