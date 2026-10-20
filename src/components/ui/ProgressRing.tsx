import { motion } from 'framer-motion';
import { EASE, springSoft } from './motionTokens';
import { CountUp } from './CountUp';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  tone?: 'primary' | 'success' | 'accent' | 'warning';
  /** Unique id so multiple rings on one page get distinct gradients. */
  gradientId?: string;
  /** Animate the numeric label with a count-up. */
  countUp?: boolean;
}

const gradients: Record<NonNullable<ProgressRingProps['tone']>, [string, string, string]> = {
  primary: ['#fca5a5', '#ef4444', '#b91c1c'],
  success: ['#86efac', '#22c55e', '#15803d'],
  accent: ['#93c5fd', '#3b82f6', '#1d4ed8'],
  warning: ['#fcd34d', '#f59e0b', '#b45309'],
};

export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 10,
  label,
  sublabel,
  className = '',
  tone = 'primary',
  gradientId = 'ringGradient',
  countUp = false,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clamped = Math.max(0, Math.min(100, progress));
  const offset = circumference - (clamped / 100) * circumference;
  const [from, mid, to] = gradients[tone];
  const numericLabel = /^\d+$/.test(label ?? '') ? Number(label) : null;

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="55%" stopColor={mid} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
          <filter id={`${gradientId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc with a soft glow */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          filter={`url(#${gradientId}-glow)`}
          initial={{ strokeDashoffset: circumference, opacity: 0 }}
          animate={{ strokeDashoffset: offset, opacity: 1 }}
          transition={{ duration: 1.1, ease: EASE }}
        />
      </svg>

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...springSoft, delay: 0.15 }}
      >
        {label && (
          <span className="text-2xl font-bold text-white font-sans tabular-nums">
            {countUp && numericLabel !== null ? (
              <CountUp value={numericLabel} suffix="%" />
            ) : (
              label
            )}
          </span>
        )}
        {sublabel && <span className="text-xs text-gray-400 mt-0.5">{sublabel}</span>}
      </motion.div>
    </div>
  );
}
