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
  primary:
    'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30',
  secondary: 'glass-strong hover:bg-white/[0.08] text-gray-200',
  ghost: 'hover:bg-white/[0.05] text-gray-300',
  danger: 'bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800/40',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-xl',
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
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 480, damping: 30 }}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
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
