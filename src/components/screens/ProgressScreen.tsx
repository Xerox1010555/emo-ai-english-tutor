import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  Flame,
  Target,
  TrendingUp,
  Zap,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTutor } from '@/context/TutorContext';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { CEFR_ORDER, levelIndex } from '@/lib/learning/constants';
import { estimateLevelFromProgress } from '@/lib/learning/profile';
import type { DailyLesson, LevelHistoryEntry, QuizResult, VocabItem } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EASE } from '@/components/ui/motionTokens';
import {
  EmptyState,
  PageHeader,
  Pill,
  SectionHeader,
  SkillGrid,
  StatCard,
} from '@/components/ui/primitives';
import type { TabId } from '@/components/Layout';

const allSkills = ['Grammar', 'Vocabulary', 'Listening', 'Speaking', 'Writing', 'Reading'] as const;

export function ProgressScreen({ onNavigate }: { onNavigate?: (tab: TabId) => void }) {
  const { profile, user, refreshProfile } = useAuth();
  const { profileSnapshot, profileLoading, refreshSnapshot } = useTutor();
  const { t } = useI18n();
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [lessons, setLessons] = useState<DailyLesson[]>([]);
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [levelHistory, setLevelHistory] = useState<LevelHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [promoteNote, setPromoteNote] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [quizzes, lessonsData, vocabData, historyData] = await Promise.all([
      supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: true }),
      supabase
        .from('daily_lessons')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true }),
      supabase.from('vocabulary').select('*').eq('user_id', user.id),
      supabase
        .from('level_history')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: true }),
    ]);

    if (quizzes.data) setQuizResults(quizzes.data as QuizResult[]);
    if (lessonsData.data) setLessons(lessonsData.data as DailyLesson[]);
    if (vocabData.data) setVocab(vocabData.data as VocabItem[]);
    if (historyData.data) setLevelHistory(historyData.data as LevelHistoryEntry[]);
  }, [user]);

  useEffect(() => {
    void loadData().finally(() => setLoading(false));
  }, [loadData]);

  const completedLessons = useMemo(
    () => lessons.filter((l) => l.completed).length,
    [lessons],
  );
  const masteredVocab = useMemo(() => vocab.filter((v) => v.mastered).length, [vocab]);
  const avgQuizScore = useMemo(() => {
    const valid = quizResults.filter((q) => q.total > 0);
    if (valid.length === 0) return null;
    return Math.round(
      valid.reduce((sum, q) => sum + (q.score / q.total) * 100, 0) / valid.length,
    );
  }, [quizResults]);

  const currentLevelIdx = levelIndex(profile?.current_level ?? 'A1');
  const targetLevelIdx = levelIndex(profile?.target_level ?? 'B2');
  // "Progress to target" used to be current/target, which is always 0% for an
  // A1 learner and misleading for everyone else. It is now the share of the
  // CEFR ladder that is behind you, and the card states the remaining steps.
  const stepsToTarget = Math.max(0, targetLevelIdx - currentLevelIdx);
  const levelProgress = Math.min(
    100,
    Math.round((currentLevelIdx / Math.max(targetLevelIdx, 1)) * 100),
  );

  // Level check: the estimate only counts when enough skills have real signal.
  const estimate = estimateLevelFromProgress(profileSnapshot.skillProgress);
  const canPromote =
    estimate !== null &&
    levelIndex(estimate) > currentLevelIdx &&
    allSkills.filter((s) => profileSnapshot.skillProgress[s] > 0).length >= 3;

  async function promoteLevel() {
    if (!user || !estimate) return;
    setPromoting(true);
    setPromoteNote(null);
    const { error } = await supabase
      .from('profiles')
      .update({ current_level: estimate })
      .eq('id', user.id);
    if (error) {
      setPromoteNote('Could not update your level. Try again.');
    } else {
      await supabase
        .from('level_history')
        .insert({ user_id: user.id, level: estimate, score: 100 });
      setPromoteNote(`Level updated to ${estimate}. Your plan and tutor now follow it.`);
      await refreshProfile();
      await refreshSnapshot();
    }
    setPromoting(false);
  }

  const recentQuizzes = quizResults.slice(-10);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      // Local day, matching todayKey() — the lesson rows are keyed to the
      // user's calendar day, not UTC.
      const y = d.getFullYear();
      const dateStr = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        date: dateStr,
        count: lessons.filter((l) => l.date === dateStr && l.completed).length,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' })[0],
      };
    });
  }, [lessons]);

  const hasSkillData = allSkills.some((s) => profileSnapshot.skillProgress[s] > 0);

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 shimmer-bg animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader title={t('progress.title')} subtitle={t('progress.subtitle')} />

      {/* Level */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: EASE }}>
        <Card className="flex items-center gap-5">
          <ProgressRing
            progress={levelProgress}
            size={112}
            strokeWidth={8}
            label={`${levelProgress}%`}
            sublabel="to target"
            gradientId="levelRing"
            tone="accent"
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-gray-300">
                <span className="font-bold text-white">{profile?.current_level}</span>
                <span className="text-gray-600 mx-1">→</span>
                <span className="font-bold text-white">{profile?.target_level}</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              {stepsToTarget > 0
                ? `${stepsToTarget} level${stepsToTarget > 1 ? 's' : ''} between you and your target`
                : 'You are at your target level'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CEFR_ORDER.map((lvl, i) => {
                const passed = i < currentLevelIdx;
                const current = i === currentLevelIdx;
                return (
                  <span
                    key={lvl}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      passed
                        ? 'bg-success-500/15 text-success-400'
                        : current
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'bg-white/[0.03] text-gray-600'
                    }`}
                  >
                    {lvl}
                  </span>
                );
              })}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Level check — a conservative estimate, applied only with the learner's
          confirmation. Nothing is promoted silently. */}
      {canPromote && estimate && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE }}
        >
          <SectionHeader title="Level check" />
          <Card className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-success-500/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-[18px] h-[18px] text-success-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  Your work now points to {estimate}
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Your recent lessons and quizzes suggest you are working at {estimate} level
                  (currently {profile?.current_level}). Moving up unlocks harder content.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void promoteLevel()} loading={promoting}>
                Move me to {estimate}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPromoteNote('No problem — staying at your current level.')}>
                Not yet
              </Button>
            </div>
            {promoteNote && (
              <p className="text-[11px] text-gray-400 leading-relaxed">{promoteNote}</p>
            )}
          </Card>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE, delay: 0.05 }}
        className="grid grid-cols-2 gap-3"
      >
        <StatCard icon={Flame} label="Day Streak" value={String(profile?.streak ?? 0)} tone="primary" />
        <StatCard icon={BookOpen} label="Lessons Done" value={String(completedLessons)} tone="accent" />
        <StatCard
          icon={Brain}
          label="Avg Quiz"
          value={avgQuizScore === null ? '—' : `${avgQuizScore}%`}
          tone="success"
        />
        <StatCard
          icon={Target}
          label="Quests Done"
          value={String(profileSnapshot.completedQuests)}
          tone="primary"
        />
      </motion.div>

      {/* Skills */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE, delay: 0.1 }}
      >
        <SectionHeader
          title="Skill breakdown"
          action={profileLoading ? (
            <span className="w-3 h-3 rounded-full border-2 border-primary-400/40 border-t-primary-400 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-gray-600" />
          )}
        />
        <Card className="space-y-4">
          {hasSkillData ? (
            <>
              <SkillGrid progress={profileSnapshot.skillProgress} />
              <div className="pt-3 border-t border-white/[0.05] space-y-2.5">
                {profileSnapshot.strengths.length > 0 && (
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    <span className="text-success-400 font-semibold">Strongest: </span>
                    {profileSnapshot.strengths.join(', ')} — the tutor stretches these instead of
                    drilling them.
                  </p>
                )}
                {profileSnapshot.weaknesses.length > 0 && (
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    <span className="text-warning-400 font-semibold">Focus next: </span>
                    {profileSnapshot.weaknesses.join(', ')} — quests and questions are weighted here.
                  </p>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              icon={Target}
              title="Not enough data yet"
              body="Take a quiz or complete a lesson and each skill starts scoring on its own."
            />
          )}
        </Card>
      </motion.div>

      {/* Recurring mistakes */}
      {profileSnapshot.recurringMistakes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE, delay: 0.15 }}
        >
          <SectionHeader title="What the tutor keeps correcting" />
          <Card className="space-y-2.5">
            {profileSnapshot.recurringMistakes.slice(0, 5).map((mistake) => (
              <div
                key={mistake.label}
                className="flex items-start gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0"
              >
                <AlertCircle className="w-3.5 h-3.5 text-warning-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-300 truncate">{mistake.label}</p>
                  <p className="text-[11px] text-gray-500">seen {mistake.weight}×</p>
                </div>
                <Pill tone="warning">{mistake.category}</Pill>
              </div>
            ))}
          </Card>
        </motion.div>
      )}

      {/* Quiz trend */}
      {recentQuizzes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE, delay: 0.2 }}
        >
          <SectionHeader title="Quiz score trend" />
          <Card>
            <div className="flex items-end justify-between gap-2 h-32">
              {recentQuizzes.map((q, i) => {
                const pct = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;
                return (
                  <div key={q.id ?? i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                      <motion.div
                        className="w-full max-w-[24px] rounded-t-md bg-gradient-to-t from-primary-600 to-primary-400"
                        initial={{ height: 0 }}
                        animate={{ height: `${(pct / 100) * 80}px` }}
                        transition={{ duration: 0.6, ease: EASE, delay: i * 0.04 }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-600">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Weekly activity */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE, delay: 0.25 }}
      >
        <SectionHeader title="This week" />
        <Card>
          <div className="flex items-end justify-between gap-2 h-28">
            {last7Days.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end justify-center" style={{ height: '70px' }}>
                  <motion.div
                    className={`w-full max-w-[28px] rounded-t-md ${
                      day.count > 0 ? 'bg-gradient-to-t from-accent-600 to-accent-400' : 'bg-white/[0.04]'
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: day.count > 0 ? `${Math.min(day.count * 30, 70)}px` : '4px' }}
                    transition={{ duration: 0.5, ease: EASE }}
                  />
                </div>
                <span className="text-[10px] text-gray-600 font-medium">{day.dayName}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Vocabulary */}
      {vocab.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE, delay: 0.3 }}
        >
          <SectionHeader title="Vocabulary mastery" />
          <Card>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm text-gray-300">
                <span className="font-bold text-white">{masteredVocab}</span> / {vocab.length} mastered
              </span>
              <span className="text-xs text-gray-500">
                {Math.round((masteredVocab / vocab.length) * 100)}%
              </span>
            </div>
            <ProgressBar
              progress={(masteredVocab / vocab.length) * 100}
              tone="success"
              height="md"
              label="Vocabulary mastery"
            />
            {onNavigate && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => onNavigate('vocabulary')}
              >
                Open vocabulary studio
              </Button>
            )}
          </Card>
        </motion.div>
      )}

      {/* Level history */}
      {levelHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE, delay: 0.35 }}
        >
          <SectionHeader title="Level history" />
          <Card className="space-y-1">
            {[...levelHistory].reverse().slice(0, 5).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-success-400" />
                  <span className="text-sm text-gray-300">Level {h.level}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(h.recorded_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </Card>
        </motion.div>
      )}

      {/* XP */}
      {profileSnapshot.xp > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE, delay: 0.4 }}
          className="grid grid-cols-2 gap-3"
        >
          <StatCard icon={Zap} label="Total XP" value={String(profileSnapshot.xp)} tone="warning" />
          <StatCard
            icon={Sparkles}
            label="Avg / Quest"
            value={
              profileSnapshot.completedQuests > 0
                ? String(Math.round(profileSnapshot.xp / profileSnapshot.completedQuests))
                : '—'
            }
            tone="primary"
          />
        </motion.div>
      )}
    </div>
  );
}
