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
  primary: 'from-primary-600 to-primary-400',
  success: 'from-success-600 to-success-400',
  warning: 'from-warning-600 to-warning-400',
  accent: 'from-accent-600 to-accent-400',
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
      className={`w-full ${track} bg-white/[0.06] rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
    >
      <motion.div
        className={`h-full bg-gradient-to-r ${tones[tone]} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.7, ease: EASE }}
      />
    </div>
  );
}
