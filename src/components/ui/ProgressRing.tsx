import { motion } from 'framer-motion';
import { EASE, springSoft } from './motionTokens';

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
}

const gradients: Record<NonNullable<ProgressRingProps['tone']>, [string, string]> = {
  primary: ['#ef4444', '#dc2626'],
  success: ['#22c55e', '#16a34a'],
  accent: ['#3b82f6', '#2563eb'],
  warning: ['#f59e0b', '#d97706'],
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
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clamped = Math.max(0, Math.min(100, progress));
  const offset = circumference - (clamped / 100) * circumference;
  const [from, to] = gradients[tone];

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </svg>
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...springSoft, delay: 0.15 }}
      >
        {label && <span className="text-2xl font-bold text-white font-sans tabular-nums">{label}</span>}
        {sublabel && <span className="text-xs text-gray-400 mt-0.5">{sublabel}</span>}
      </motion.div>
    </div>
  );
}
