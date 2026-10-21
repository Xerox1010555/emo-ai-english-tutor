import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Coins,
  Download,
  GraduationCap,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, Pill, SectionHeader, StatCard } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EASE } from '@/components/ui/motionTokens';

interface AdminStats {
  generatedAt: string;
  totals: {
    learners: number;
    activeLearners: number;
    placedLearners: number;
    totalXp: number;
    totalLessons: number;
    totalQuests: number;
    totalChats: number;
    exams: number;
    avgXpPerLearner: number;
  };
  cost: {
    estimatedCalls: number;
    estimatedUsd: number;
    pricePerCall: number;
    note: string;
  };
  activity: { date: string; lessons: number; chats: number; quizzes: number }[];
  levelDistribution: { level: string; count: number }[];
  topMistakes: { label: string; category: string; total: number; learners: number }[];
  learners: {
    id: string;
    email: string;
    current_level: string;
    target_level: string;
    streak: number;
    xp: number;
    lessons: number;
    quests: number;
    chats: number;
    quizzes: number;
    quiz_average: number | null;
    vocab: number;
    last_active_date: string | null;
  }[];
}

export function AdminScreen() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-stats', {
        body: {},
      });
      if (invokeError || !data) {
        setError(
          'The admin endpoint is not available. Deploy `supabase functions deploy admin-stats` and make sure your profile has is_admin = true.',
        );
        setLoading(false);
        return;
      }
      setStats(data as AdminStats);
    } catch {
      setError('Could not reach the admin endpoint.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function exportCsv() {
    if (!stats) return;
    const header = [
      'email',
      'level',
      'target',
      'xp',
      'streak',
      'lessons',
      'quests',
      'chats',
      'quizzes',
      'quiz_average',
      'vocab',
      'last_active',
    ];
    const rows = stats.learners.map((l) =>
      [
        l.email,
        l.current_level,
        l.target_level,
        l.xp,
        l.streak,
        l.lessons,
        l.quests,
        l.chats,
        l.quizzes,
        l.quiz_average ?? '',
        l.vocab,
        l.last_active_date ?? '',
      ].join(','),
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emo-learners-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-4">
        <div className="h-28 shimmer-bg animate-shimmer rounded-2xl" />
        <div className="h-40 shimmer-bg animate-shimmer rounded-2xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="px-5 py-6 space-y-4">
        <PageHeader title="Admin" subtitle="Cohort analytics" />
        <Card className="space-y-3 text-center py-10">
          <AlertCircle className="w-8 h-8 text-warning-400 mx-auto" />
          <p className="text-sm text-gray-300">{error ?? 'No data.'}</p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  const maxActivity = Math.max(1, ...stats.activity.map((d) => d.chats + d.lessons));
  const maxMistake = Math.max(1, ...stats.topMistakes.map((m) => m.total));

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader
        title="Admin"
        subtitle={`Cohort analytics · generated ${new Date(stats.generatedAt).toLocaleString()}`}
        action={
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Learners" value={String(stats.totals.learners)} tone="primary" />
        <StatCard
          icon={Activity}
          label="Active"
          value={String(stats.totals.activeLearners)}
          tone="accent"
        />
        <StatCard
          icon={GraduationCap}
          label="Placed"
          value={String(stats.totals.placedLearners)}
          tone="success"
        />
        <StatCard
          icon={BarChart3}
          label="Avg XP"
          value={String(stats.totals.avgXpPerLearner)}
          tone="warning"
        />
      </div>

      {/* Cost */}
      <div>
        <SectionHeader title="Model cost" />
        <Card hairline depth={3} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning-500/12 border border-warning-500/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-warning-300" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white font-sans tabular-nums">
                ${stats.cost.estimatedUsd.toFixed(2)}
              </p>
              <p className="text-[11px] text-gray-500">
                ≈ {stats.cost.estimatedCalls.toLocaleString()} calls · $
                {stats.cost.pricePerCall} each
              </p>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">{stats.cost.note}</p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-xl bg-black/25 border border-white/[0.05] p-2.5 text-center">
              <p className="text-sm font-bold text-white">{stats.totals.totalChats}</p>
              <p className="text-[10px] text-gray-500">tutor turns</p>
            </div>
            <div className="rounded-xl bg-black/25 border border-white/[0.05] p-2.5 text-center">
              <p className="text-sm font-bold text-white">{stats.totals.totalLessons}</p>
              <p className="text-[10px] text-gray-500">lessons</p>
            </div>
            <div className="rounded-xl bg-black/25 border border-white/[0.05] p-2.5 text-center">
              <p className="text-sm font-bold text-white">{stats.totals.exams}</p>
              <p className="text-[10px] text-gray-500">mocks</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity */}
      <div>
        <SectionHeader title="Last 14 days" />
        <Card className="space-y-3">
          <div className="flex items-end justify-between gap-1.5 h-28">
            {stats.activity.map((day) => {
              const value = day.chats + day.lessons;
              const height = Math.max(5, (value / maxActivity) * 76);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <motion.div
                      className="w-full max-w-[16px] rounded-t-md bg-gradient-to-t from-primary-600 to-accent-400"
                      initial={{ height: 0 }}
                      animate={{ height }}
                      transition={{ duration: 0.5, ease: EASE }}
                    />
                  </div>
                  <span className="text-[8px] text-gray-600">{day.date.slice(8)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500">
            {stats.totals.totalChats} tutor turns · {stats.totals.totalLessons} lessons ·{' '}
            {stats.totals.totalQuests} quests completed in total
          </p>
        </Card>
      </div>

      {/* Level distribution */}
      {stats.levelDistribution.length > 0 && (
        <div>
          <SectionHeader title="Level distribution" />
          <Card className="space-y-2.5">
            {stats.levelDistribution
              .slice()
              .sort((a, b) => a.level.localeCompare(b.level))
              .map((entry) => (
                <div key={entry.level} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 w-8">{entry.level}</span>
                  <div className="flex-1">
                    <ProgressBar
                      progress={(entry.count / Math.max(1, stats.totals.learners)) * 100}
                      height="sm"
                      label={`${entry.level} learners`}
                    />
                  </div>
                  <span className="text-xs text-gray-500 tabular-nums w-8 text-right">
                    {entry.count}
                  </span>
                </div>
              ))}
          </Card>
        </div>
      )}

      {/* Recurring mistakes across the cohort */}
      {stats.topMistakes.length > 0 && (
        <div>
          <SectionHeader title="What the cohort keeps getting wrong" />
          <Card className="space-y-2.5">
            {stats.topMistakes.map((mistake) => (
              <div key={mistake.label} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-300 truncate">{mistake.label}</span>
                  <Pill tone="warning">{mistake.category}</Pill>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ProgressBar
                      progress={(mistake.total / maxMistake) * 100}
                      height="sm"
                      tone="warning"
                      label={mistake.label}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 tabular-nums w-16 text-right">
                    {mistake.total}× · {mistake.learners} learners
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Learners */}
      <div>
        <SectionHeader title="Learners" />
        <div className="space-y-2">
          {stats.learners.slice(0, 40).map((learner) => (
            <Card key={learner.id} className="py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {learner.email || 'Unknown learner'}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {learner.current_level} → {learner.target_level} ·{' '}
                    {learner.last_active_date ?? 'never active'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Pill tone="primary">{learner.xp} XP</Pill>
                  {learner.streak > 0 && <Pill tone="accent">{learner.streak}d</Pill>}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { label: 'lessons', value: learner.lessons },
                  { label: 'quests', value: learner.quests },
                  { label: 'chats', value: learner.chats },
                  { label: 'quiz', value: learner.quiz_average === null ? '—' : `${learner.quiz_average}%` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg bg-black/25 border border-white/[0.05] py-1.5"
                  >
                    <p className="text-xs font-bold text-white tabular-nums">{stat.value}</p>
                    <p className="text-[9px] text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
