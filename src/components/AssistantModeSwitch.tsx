import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Megaphone, ShieldCheck, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTutor } from '@/context/TutorContext';
import type { AssistantMode } from '@/lib/ai/types';
import { EASE, springSnappy } from '@/components/ui/motionTokens';

interface ModeMeta {
  id: AssistantMode;
  label: string;
  icon: LucideIcon;
  blurb: string;
  detail: string;
}

const MODES: ModeMeta[] = [
  {
    id: 'friendly',
    label: 'Friendly',
    icon: Heart,
    blurb: 'Warm and encouraging',
    detail: 'Gentle corrections, celebrates progress, keeps pressure low.',
  },
  {
    id: 'coach',
    label: 'Coach',
    icon: Megaphone,
    blurb: 'Direct and challenging',
    detail: 'Pushes for more output, holds a clear standard, stays concise.',
  },
  {
    id: 'strict',
    label: 'Strict',
    icon: ShieldCheck,
    blurb: 'Accountability, not abuse',
    detail: 'Holds you to your commitments. Plain about gaps, never insulting.',
  },
];

/** Compact selector for the chat header. */
export function AssistantModeSwitch({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTutor();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const active = MODES.find((m) => m.id === mode) ?? MODES[0];
  const ActiveIcon = active.icon;

  async function select(next: AssistantMode) {
    if (next === mode) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await setMode(next);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Assistant mode: ${active.label}`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass hover:bg-white/[0.08] text-gray-300 transition-colors disabled:opacity-50"
      >
        <ActiveIcon className="w-3.5 h-3.5 text-primary-400" />
        {!compact && <span className="text-xs font-semibold">{active.label}</span>}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={springSnappy}>
          <ChevronDown className="w-3 h-3 text-gray-600" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="absolute right-0 top-full mt-2 z-40 w-72 glass-strong rounded-2xl shadow-lift p-2 overflow-hidden"
            >
              {MODES.map((option) => {
                const Icon = option.icon;
                const isActive = option.id === mode;
                return (
                  <button
                    key={option.id}
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => void select(option.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${
                      isActive ? 'bg-primary-500/10' : 'hover:bg-white/[0.05]'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-primary-500/15' : 'bg-white/[0.04]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-primary-400' : 'text-gray-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {option.label}
                        <span className="text-[11px] font-normal text-gray-500 ml-2">
                          {option.blurb}
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{option.detail}</p>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Full-width selector used in Settings. */
export function AssistantModeCards() {
  const { mode, setMode } = useTutor();
  const [saving, setSaving] = useState<AssistantMode | null>(null);

  return (
    <div className="space-y-2.5">
      {MODES.map((option) => {
        const Icon = option.icon;
        const isActive = option.id === mode;
        return (
          <button
            key={option.id}
            onClick={() => {
              if (isActive) return;
              setSaving(option.id);
              void setMode(option.id).finally(() => setSaving(null));
            }}
            disabled={saving !== null}
            className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all disabled:opacity-50 ${
              isActive
                ? 'border-primary-500/40 bg-primary-500/[0.06]'
                : 'glass border-white/[0.06] hover:bg-white/[0.05]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isActive ? 'bg-primary-500/15' : 'bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-primary-400' : 'text-gray-500'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">{option.label}</p>
                {saving === option.id && (
                  <span className="w-3 h-3 rounded-full border-2 border-primary-400/40 border-t-primary-400 animate-spin" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{option.blurb}</p>
              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">{option.detail}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                isActive ? 'border-primary-500' : 'border-white/15'
              }`}
            >
              {isActive && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { MODES as ASSISTANT_MODES_META };
