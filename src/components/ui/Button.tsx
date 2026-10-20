import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'
  > {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  // A gradient body with a coloured ambient shadow reads as a real control,
  // not a flat rectangle.
  primary:
    'text-white bg-gradient-to-b from-primary-400 to-primary-600 shadow-glow-primary border border-primary-300/25 hover:from-primary-300 hover:to-primary-500',
  secondary:
    'glass-panel text-gray-100 border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.06]',
  ghost:
    'text-gray-300 hover:text-white hover:bg-white/[0.06] border border-transparent',
  danger:
    'text-red-200 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 backdrop-blur-md',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3.5 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-2xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 460, damping: 28 }}
      className={`relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none select-none ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <span
          className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0"
          aria-hidden
        />
      )}
      {children}
    </motion.button>
  );
}
