import { supabase } from '@/lib/supabase';
import type { WeeklyComparison } from '@/lib/learning/weeklyReport';
import type { Skill } from '@/lib/types';

/**
 * Client for the AI weekly report.
 *
 * The numbers are computed on the device (see `lib/learning/weeklyReport`) and
 * sent as facts; the model only turns them into a story. If the model is not
 * available the caller falls back to a computed headline, so the screen is
 * never empty.
 */

export interface WeeklyReportInput {
  level: string;
  targetLevel: string;
  goals: string[];
  language: 'ar' | 'en';
  comparison: WeeklyComparison;
  skillProgress: Record<Skill, number>;
}

export interface WeeklyReport {
  headline: string;
  wins: string[];
  focus: string[];
  suggestion: string;
  model: string | null;
}

export async function generateWeeklyReport(input: WeeklyReportInput): Promise<WeeklyReport | null> {
  try {
    const { data, error } = await supabase.functions.invoke('content-gen', {
      body: {
        kind: 'report',
        level: input.level,
        targetLevel: input.targetLevel,
        goals: input.goals,
        language: input.language,
        facts: {
          thisWeek: input.comparison.thisWeek,
          lastWeek: input.comparison.lastWeek,
          deltas: input.comparison.deltas,
          skillProgress: input.skillProgress,
        },
      },
    });

    if (error || !data) return null;

    const raw =
      typeof data === 'object' && data !== null && 'report' in (data as Record<string, unknown>)
        ? (data as { report: unknown }).report
        : data;

    return validateReport(raw, typeof data === 'object' && data !== null ? (data as { model?: string }).model ?? null : null);
  } catch {
    return null;
  }
}

function validateReport(raw: unknown, model: string | null): WeeklyReport | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;

  const headline = typeof data.headline === 'string' ? data.headline.trim() : '';
  if (!headline || headline.length > 300) return null;

  const list = (value: unknown, max: number): string[] =>
    Array.isArray(value)
      ? value
          .filter((v): v is string => typeof v === 'string')
          .map((v) => v.trim().slice(0, 240))
          .filter(Boolean)
          .slice(0, max)
      : [];

  const suggestion =
    typeof data.suggestion === 'string' ? data.suggestion.trim().slice(0, 400) : '';

  return {
    headline,
    wins: list(data.wins, 4),
    focus: list(data.focus, 3),
    suggestion,
    model,
  };
}
