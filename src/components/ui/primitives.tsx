import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { SKILL_META } from '@/lib/learning/constants';
import type { Skill } from '@/lib/types';
import { springSnappy } from './motionTokens';

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-1">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-white font-sans">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'primary',
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: 'primary' | 'accent' | 'success' | 'warning';
  hint?: string;
}) {
  const tones = {
    primary: { text: 'text-primary-400', bg: 'bg-primary-500/10' },
    accent: { text: 'text-accent-400', bg: 'bg-accent-500/10' },
    success: { text: 'text-success-400', bg: 'bg-success-500/10' },
    warning: { text: 'text-warning-400', bg: 'bg-warning-500/10' },
  } as const;
  const t = tones[tone];

  return (
    <div className="glass rounded-2xl p-4 shadow-card">
      <div className={`w-9 h-9 rounded-xl ${t.bg} flex items-center justify-center mb-2.5`}>
        <Icon className={`w-[18px] h-[18px] ${t.text}`} />
      </div>
      <p className="text-2xl font-bold text-white font-sans tabular-nums leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5">{label}</p>
      {hint && <p className="text-[10px] text-gray-600 mt-0.5">{hint}</p>}
    </div>
  );
}

const skillToneClasses: Record<string, { text: string; fill: string; bg: string }> = {
  primary: { text: 'text-primary-400', fill: 'from-primary-600 to-primary-400', bg: 'bg-primary-500/10' },
  accent: { text: 'text-accent-400', fill: 'from-accent-600 to-accent-400', bg: 'bg-accent-500/10' },
  success: { text: 'text-success-400', fill: 'from-success-600 to-success-400', bg: 'bg-success-500/10' },
  warning: { text: 'text-warning-400', fill: 'from-warning-600 to-warning-400', bg: 'bg-warning-500/10' },
};

/** Per-skill progress row used on Progress and in stage details. */
export function SkillRow({
  skill,
  value,
  label,
}: {
  skill: Skill;
  value: number;
  label?: string;
}) {
  const tone = skillToneClasses[SKILL_META[skill].accent] ?? skillToneClasses.primary;
  const hasData = value > 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 sm:w-28 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-300 truncate">{label ?? skill}</p>
      </div>
      <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden min-w-0">
        <motion.div
          className={`h-full bg-gradient-to-r ${tone.fill} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums w-9 text-right flex-shrink-0 ${hasData ? tone.text : 'text-gray-700'}`}>
        {hasData ? `${value}%` : '—'}
      </span>
    </div>
  );
}

export function SkillGrid({ progress }: { progress: Record<Skill, number> }) {
  return (
    <div className="space-y-3">
      {(Object.keys(progress) as Skill[]).map((skill) => (
        <SkillRow key={skill} skill={skill} value={progress[skill]} />
      ))}
    </div>
  );
}

/** Small pill for tags like skill names and levels. */
export function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'accent';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-white/[0.05] text-gray-400',
    primary: 'bg-primary-500/10 text-primary-400',
    success: 'bg-success-500/10 text-success-400',
    warning: 'bg-warning-500/10 text-warning-400',
    accent: 'bg-accent-500/10 text-accent-400',
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Segmented control used for modes and filters. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 p-1 bg-black/30 rounded-xl ${className}`} role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className="relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            {active && (
              <motion.span
                layoutId={`seg-${options.map((o) => o.value).join('-')}`}
                className="absolute inset-0 bg-white/[0.08] rounded-lg"
                transition={springSnappy}
              />
            )}
            <span className={`relative flex items-center gap-1.5 ${active ? 'text-white' : 'text-gray-500'}`}>
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <p className="text-sm font-semibold text-gray-300">{title}</p>
      {body && <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonList({ count = 3, height = 'h-20' }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${height} shimmer-bg animate-shimmer rounded-2xl`} />
      ))}
    </div>
  );
}
