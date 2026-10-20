import { motion } from 'framer-motion';
import { EASE } from './motionTokens';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  tone?: 'primary' | 'success' | 'warning' | 'accent';
  height?: 'sm' | 'md';
  label?: string;
}

const tones: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  primary: 'from-primary-600 via-primary-500 to-primary-400',
  success: 'from-success-600 via-success-500 to-success-400',
  warning: 'from-warning-600 via-warning-500 to-warning-400',
  accent: 'from-accent-600 via-accent-500 to-accent-400',
};

export function ProgressBar({
  progress,
  className = '',
  tone = 'primary',
  height = 'sm',
  label,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const track = height === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div
      className={`w-full ${track} bg-white/[0.07] rounded-full overflow-hidden border border-white/[0.04] ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
    >
      <motion.div
        className={`relative h-full bg-gradient-to-r ${tones[tone]} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        {/* A highlight travelling along the filled portion. */}
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <span className="absolute inset-y-0 w-1/3 -skew-x-12 bg-white/25 animate-shimmer" />
        </span>
      </motion.div>
    </div>
  );
}
