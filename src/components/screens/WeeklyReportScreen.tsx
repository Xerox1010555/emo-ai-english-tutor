import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Brain,
  CalendarDays,
  Flame,
  MessageCircle,
  Minus,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTutor } from '@/context/TutorContext';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import {
  buildDailyActivity,
  buildWeeklyComparison,
  fallbackHeadline,
  weekStart,
  type RawWeekData,
  type WeeklyComparison,
} from '@/lib/learning/weeklyReport';
import { generateWeeklyReport } from '@/lib/ai/report';
import { SKILLS } from '@/lib/learning/constants';
import type { Skill } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, Pill, SectionHeader, StatCard } from '@/components/ui/primitives';
import { CountUp } from '@/components/ui/CountUp';
import { EASE } from '@/components/ui/motionTokens';

interface ReportData {
  headline: string;
  wins: string[];
  focus: string[];
  suggestion: string;
  model: string | null;
}

export function WeeklyReportScreen() {
  const { user, profile } = useAuth();
  const { profileSnapshot } = useTutor();
  const { t } = useI18n();
  const [comparison, setComparison] = useState<WeeklyComparison | null>(null);
  const [activity, setActivity] = useState<ReturnType<typeof buildDailyActivity>>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const [lessons, quests, quizzes, chat, vocabulary, skillRows] = await Promise.all([
      supabase.from('daily_lessons').select('date, completed, duration_minutes').eq('user_id', user.id),
      supabase.from('daily_quests').select('date, completed, xp_reward').eq('user_id', user.id),
      supabase.from('quiz_results').select('taken_at, score, total').eq('user_id', user.id),
      supabase.from('conversation_logs').select('created_at, role').eq('user_id', user.id),
      supabase.from('vocabulary').select('created_at, mastered, box').eq('user_id', user.id),
      supabase.from('skill_progress').select('skill, score, updated_at').eq('user_id', user.id),
    ]);

    const raw: RawWeekData = {
      lessons: (lessons.data ?? []) as RawWeekData['lessons'],
      quests: (quests.data ?? []) as RawWeekData['quests'],
      quizzes: (quizzes.data ?? []) as RawWeekData['quizzes'],
      chat: (chat.data ?? []) as RawWeekData['chat'],
      vocabulary: (vocabulary.data ?? []) as RawWeekData['vocabulary'],
      skillProgress: (skillRows.data ?? []).map((row) => ({
        skill: row.skill as Skill,
        score: Number(row.score) || 0,
        at: String(row.updated_at ?? ''),
      })),
    };

    setComparison(buildWeeklyComparison(raw, new Date(), SKILLS));
    setActivity(buildDailyActivity(raw, 7, new Date()));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Cached report first (no model call), then an optional fresh one.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart(new Date()))
        .maybeSingle();

      if (cancelled) return;
      if (data) {
        setReport({
          headline: data.headline,
          wins: Array.isArray(data.wins) ? (data.wins as string[]) : [],
          focus: Array.isArray(data.focus) ? (data.focus as string[]) : [],
          suggestion: data.suggestion ?? '',
          model: data.model ?? null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const generate = useCallback(async () => {
    if (!user || !comparison) return;
    setGenerating(true);
    setError(null);

    const result = await generateWeeklyReport({
      level: profile?.current_level ?? 'A1',
      targetLevel: profile?.target_level ?? 'B2',
      goals: profile?.learning_goals ?? [],
      language: profile?.preferred_language === 'en' ? 'en' : 'ar',
      comparison,
      skillProgress: profileSnapshot.skillProgress,
    });

    if (result) {
      setReport(result);
      await supabase.from('weekly_reports').upsert(
        {
          user_id: user.id,
          week_start: weekStart(new Date()),
          headline: result.headline,
          wins: result.wins,
          focus: result.focus,
          suggestion: result.suggestion,
          model: result.model,
        },
        { onConflict: 'user_id,week_start' },
      );
    } else {
      // The model is unavailable — the numbers still tell the story.
      setReport({
        headline: fallbackHeadline(comparison),
        wins: [],
        focus: comparison.focusSkill
          ? [`${comparison.focusSkill.skill} is at ${comparison.focusSkill.score}% — it needs the most work.`]
          : [],
        suggestion: comparison.bestSkill
          ? `You improved ${comparison.bestSkill.skill}. Keep stretching it and give ${comparison.focusSkill?.skill ?? 'your weakest skill'} more time.`
          : 'Keep the daily rhythm: one lesson, one quest, a few minutes of chat.',
        model: null,
      });
    }
    setGenerating(false);
  }, [user, comparison, profile, profileSnapshot.skillProgress]);

  const maxActivity = useMemo(
    () => Math.max(1, ...activity.map((a) => a.lessons + a.quests * 0.5)),
    [activity],
  );

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-4">
        <div className="h-32 shimmer-bg animate-shimmer rounded-2xl" />
        <div className="h-24 shimmer-bg animate-shimmer rounded-2xl" />
        <div className="h-40 shimmer-bg animate-shimmer rounded-2xl" />
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="px-5 py-6">
        <PageHeader title="Weekly report" />
        <Card className="text-center py-10 space-y-3">
          <p className="text-sm text-gray-400">Your report could not be loaded.</p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  const { thisWeek, lastWeek, deltas } = comparison;

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader
        title={t('report.title')}
        subtitle={`Since ${weekStart(new Date())} · compared with the week before`}
      />

      {/* Headline */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: EASE }}>
        <Card hairline className="relative overflow-hidden shadow-glass-lg">
          <div className="aurora opacity-70" />
          <div className="noise-overlay" />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-primary-300" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                This week
              </span>
            </div>
            <h2 className="text-lg font-bold text-white font-sans leading-snug">
              {report?.headline ?? fallbackHeadline(comparison)}
            </h2>

            {report?.wins && report.wins.length > 0 && (
              <ul className="space-y-1.5">
                {report.wins.map((win) => (
                  <li key={win} className="text-xs text-gray-300 flex items-start gap-2">
                    <ArrowUpRight className="w-3.5 h-3.5 text-success-400 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed">{win}</span>
                  </li>
                ))}
              </ul>
            )}

            {report?.focus && report.focus.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {report.focus.map((item) => (
                  <li key={item} className="text-xs text-gray-400 flex items-start gap-2">
                    <Target className="w-3.5 h-3.5 text-warning-400 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {report?.suggestion && (
              <p className="text-xs text-gray-400 leading-relaxed pt-1 border-t border-white/[0.06]">
                {report.suggestion}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={() => void generate()} loading={generating}>
                <Sparkles className="w-3.5 h-3.5" />
                {report ? t('report.refresh') : t('report.story')}
              </Button>
              {report?.model && (
                <Pill tone="neutral">
                  <Brain className="w-2.5 h-2.5" /> {report.model}
                </Pill>
              )}
            </div>

            {error && <p className="text-[11px] text-red-400">{error}</p>}
          </div>
        </Card>
      </motion.div>

      {/* This week vs last week */}
      <div>
        <SectionHeader title={t('report.compare')} />
        <div className="grid grid-cols-2 gap-3">
          <CompareCard
            icon={BookOpen}
            label="Lessons"
            now={thisWeek.lessons}
            before={lastWeek.lessons}
            delta={deltas.lessons}
          />
          <CompareCard
            icon={Target}
            label="Quests"
            now={thisWeek.quests}
            before={lastWeek.quests}
            delta={deltas.quests}
          />
          <CompareCard
            icon={Flame}
            label="XP earned"
            now={thisWeek.xp}
            before={lastWeek.xp}
            delta={deltas.xp}
          />
          <CompareCard
            icon={Brain}
            label="Quiz accuracy"
            now={thisWeek.quizAccuracy ?? 0}
            before={lastWeek.quizAccuracy ?? 0}
            delta={deltas.quizAccuracy}
            suffix="%"
          />
        </div>
      </div>

      {/* Daily rhythm */}
      <div>
        <SectionHeader title={t('report.rhythm')} />
        <Card className="space-y-3">
          <div className="flex items-end justify-between gap-2 h-28">
            {activity.map((day) => {
              const value = day.lessons + day.quests * 0.5;
              const height = Math.max(6, (value / maxActivity) * 72);
              const label = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', {
                weekday: 'short',
              })[0];
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center" style={{ height: '76px' }}>
                    <motion.div
                      className={`w-full max-w-[26px] rounded-lg ${
                        value > 0
                          ? 'bg-gradient-to-t from-primary-600 to-primary-300 shadow-glow-primary'
                          : 'bg-white/[0.05]'
                      }`}
                      initial={{ height: 0 }}
                      animate={{ height }}
                      transition={{ duration: 0.6, ease: EASE }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-600 font-medium">{label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {thisWeek.activeDays} active day{thisWeek.activeDays === 1 ? '' : 's'} ·{' '}
            {thisWeek.chatTurns} message{thisWeek.chatTurns === 1 ? '' : 's'} with the tutor ·{' '}
            {thisWeek.wordsReviewed} word{thisWeek.wordsReviewed === 1 ? '' : 's'} mastered
          </p>
        </Card>
      </div>

      {/* Skill movement */}
      {(comparison.bestSkill || comparison.focusSkill) && (
        <div>
          <SectionHeader title={t('report.movement')} />
          <Card className="space-y-3">
            {comparison.bestSkill && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-success-500/12 border border-success-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-success-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{comparison.bestSkill.skill}</p>
                  <p className="text-[11px] text-gray-500">
                    {comparison.bestSkill.from}% → {comparison.bestSkill.to}% this week
                  </p>
                </div>
              </div>
            )}
            {comparison.focusSkill && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-warning-500/12 border border-warning-500/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-warning-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{comparison.focusSkill.skill}</p>
                  <p className="text-[11px] text-gray-500">
                    {comparison.focusSkill.score}% — the skill to protect next week
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={CalendarDays}
          label="Active days"
          value={String(thisWeek.activeDays)}
          tone="primary"
        />
        <StatCard
          icon={MessageCircle}
          label="Tutor turns"
          value={String(thisWeek.chatTurns)}
          tone="accent"
        />
      </div>
    </div>
  );
}

function CompareCard({
  icon: Icon,
  label,
  now,
  before,
  delta,
  suffix = '',
}: {
  icon: typeof BookOpen;
  label: string;
  now: number;
  before: number;
  delta: number | null;
  suffix?: string;
}) {
  const trend = delta === null || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="glass-panel rounded-2xl p-4 shadow-glass">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-[11px] text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-extrabold text-white font-sans tabular-nums leading-none">
        <CountUp value={now} suffix={suffix} />
      </p>
      <p
        className={`text-[11px] mt-1.5 flex items-center gap-1 ${
          trend === 'up' ? 'text-success-400' : trend === 'down' ? 'text-warning-400' : 'text-gray-600'
        }`}
      >
        <TrendIcon className="w-3 h-3" />
        {delta === null
          ? 'no comparison'
          : delta === 0
            ? `same as last week (${before}${suffix})`
            : `${delta > 0 ? '+' : ''}${delta}${suffix} vs last week`}
      </p>
    </motion.div>
  );
}
