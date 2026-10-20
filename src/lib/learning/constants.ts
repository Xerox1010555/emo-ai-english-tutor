import type { CEFRLevel, Skill } from '@/lib/types';

export const SKILLS: Skill[] = ['Grammar', 'Vocabulary', 'Listening', 'Speaking', 'Writing', 'Reading'];

export const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const SKILL_META: Record<Skill, { icon: string; accent: string; blurb: string }> = {
  Grammar: { icon: 'Braces', accent: 'primary', blurb: 'Structures, tenses, and word order' },
  Vocabulary: { icon: 'BookA', accent: 'accent', blurb: 'Words you can actually use' },
  Listening: { icon: 'Headphones', accent: 'success', blurb: 'Catching fast or quiet speech' },
  Speaking: { icon: 'Mic', accent: 'warning', blurb: 'Fluency and getting ideas out' },
  Writing: { icon: 'PenLine', accent: 'accent', blurb: 'Clear, structured written English' },
  Reading: { icon: 'BookOpenText', accent: 'success', blurb: 'Meaning beyond the words' },
};

export function levelIndex(level: CEFRLevel): number {
  const idx = CEFR_ORDER.indexOf(level);
  return idx === -1 ? 0 : idx;
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
