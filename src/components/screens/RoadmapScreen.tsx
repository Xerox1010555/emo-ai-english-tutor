import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookMarked,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Lock,
  Map,
  Play,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTutor } from '@/context/TutorContext';
import { supabase } from '@/lib/supabase';
import { ensureDailyLesson } from '@/lib/learning/dailyLesson';
import { saveVocab } from '@/lib/learning/vocab';
import { buildRoadmap, currentStage, type RoadmapStage } from '@/lib/learning/roadmap';
import { generatePlan } from '@/lib/planGenerator';
import { todayKey } from '@/lib/learning/profile';
import { notifyMilestone } from '@/lib/notifications/service';
import type { CEFRLevel, DailyLesson, LearningPlanWeek } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CelebrationOverlay, Collapse, StaggerItem, StaggerList } from '@/components/ui/motion';
import { EASE } from '@/components/ui/motionTokens';
import { PageHeader, Pill, SectionHeader, SkillRow } from '@/components/ui/primitives';
import type { TabId } from '@/components/Layout';

interface RoadmapScreenProps {
  onNavigate: (tab: TabId) => void;
}

export function RoadmapScreen({ onNavigate }: RoadmapScreenProps) {
  const { user, profile } = useAuth();
  const { profileSnapshot, setFocus } = useTutor();
  const [todayLesson, setTodayLesson] = useState<DailyLesson | null>(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekPlan, setWeekPlan] = useState<LearningPlanWeek[]>([]);
  const [lessonError, setLessonError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const stages = useMemo(
    () =>
      buildRoadmap({
        currentLevel: profile?.current_level ?? 'A1',
        completedLessons: profileSnapshot.completedLessons,
        completedQuests: profileSnapshot.completedQuests,
        skillProgress: profileSnapshot.skillProgress,
      }),
    [profile?.current_level, profileSnapshot],
  );

  const active = currentStage(stages);
  const completedStages = stages.filter((s) => s.status === 'completed').length;

  async function loadToday() {
    if (!user) {
      setLoading(false);
      return;
    }
    const date = todayKey();

    // Same shared writer the Home screen uses — one lesson per day, always.
    const lesson = await ensureDailyLesson({
      userId: user.id,
      date,
      level: profile?.current_level ?? 'A1',
      skill: profileSnapshot.weaknesses[0] ?? null,
      weakSkills: profileSnapshot.weaknesses,
      goals: profile?.learning_goals ?? [],
      language: profile?.preferred_language === 'en' ? 'en' : 'ar',
    });

    setTodayLesson(lesson);
    setLessonError(!lesson);

    setWeekPlan(
      await ensureWeeklyPlan(
        user.id,
        profile?.current_level ?? 'A1',
        profile?.target_level ?? 'B2',
      ),
    );
    setLoading(false);
  }

  /** Copies the lesson's words into the learner's vocabulary deck. */
  async function saveLessonWords() {
    if (!user || !todayLesson?.vocab?.length) return;
    let saved = 0;
    let duplicates = 0;
    for (const entry of todayLesson.vocab) {
      const result = await saveVocab(user.id, { ...entry, source: 'lesson' });
      if (result === 'saved') saved += 1;
      else if (result === 'duplicate') duplicates += 1;
    }
    setNotice(
      saved > 0
        ? `${saved} word${saved > 1 ? 's' : ''} added to your deck.`
        : duplicates > 0
          ? 'Those words are already in your deck.'
          : 'Could not save the words. Try again.',
    );
  }

  // Load today's lesson once on mount.
  useEffect(() => {
    void loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function completeLesson() {
    if (!todayLesson || !user) return;

    const { error } = await supabase
      .from('daily_lessons')
      .update({ completed: true })
      .eq('id', todayLesson.id);

    if (error) {
      setNotice('Could not save the lesson. Try again.');
      return;
    }

    setTodayLesson({ ...todayLesson, completed: true });
    setLessonOpen(false);
    await awardLessonXp(user.id, 15);

    // Only celebrate when the read actually succeeded AND every lesson of the
    // day is done. A failed read used to look like "all lessons complete".
    const { data: remaining, error: readError } = await supabase
      .from('daily_lessons')
      .select('id, completed')
      .eq('user_id', user.id)
      .eq('date', todayKey());

    if (!readError && remaining && remaining.length > 0 && remaining.every((l) => l.completed)) {
      setCelebrate(true);
      notifyMilestone('Lesson complete', 'Today\'s lesson is done. Your tutor has been updated.');
    }
  }

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader
        title="Your Roadmap"
        subtitle={`${completedStages} of ${stages.length} stages cleared · ${profile?.current_level} → ${profile?.target_level}`}
        action={
          <Button size="sm" variant="secondary" onClick={() => onNavigate('quests')}>
            <Target className="w-4 h-4" /> Quests
          </Button>
        }
      />

      {notice && (
        <div className="text-xs text-success-400 bg-success-500/5 border border-success-500/15 rounded-xl px-3.5 py-2.5">
          {notice}
        </div>
      )}

      {/* Active stage hero */}
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE }}
        >
          <Card className="relative overflow-hidden border-primary-500/20 bg-primary-500/[0.03]">
            <div className="aurora opacity-60" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Pill tone="primary">
                  <Sparkles className="w-3 h-3" /> Current stage
                </Pill>
                <span className="text-[11px] text-gray-500">
                  {active.levelRange[0]}–{active.levelRange[1]}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white font-sans">{active.name}</h2>
              <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{active.summary}</p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Stage progress</span>
                  <span className="text-primary-400 font-bold tabular-nums">{active.progress}%</span>
                </div>
                <ProgressBar progress={active.progress} height="md" label={`${active.name} progress`} />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {active.skills.map((skill) => (
                  <div
                    key={skill}
                    className="rounded-xl bg-black/25 border border-white/[0.05] px-3 py-2"
                  >
                    <p className="text-[11px] text-gray-500">{skill}</p>
                    <p className="text-sm font-bold text-white tabular-nums">
                      {profileSnapshot.skillProgress[skill]}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Today's lesson */}
      {todayLesson && (
        <div>
          <SectionHeader title="Today's lesson" />
          <Card className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Pill tone="primary">{todayLesson.skill}</Pill>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {todayLesson.duration_minutes} min
                  </span>
                  {todayLesson.source === 'ai' && (
                    <Pill tone="accent">
                      <Sparkles className="w-2.5 h-2.5" /> Written for you
                    </Pill>
                  )}
                </div>
                <h3 className="text-base font-bold text-white font-sans">{todayLesson.title}</h3>
              </div>
              {todayLesson.completed && (
                <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0" />
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setFocus({ skill: todayLesson.skill, title: todayLesson.title });
                  setLessonOpen(true);
                }}
              >
                <Play className="w-3.5 h-3.5" />
                {todayLesson.completed ? 'Review' : 'Start lesson'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onNavigate('chat')}>
                Ask the tutor
              </Button>
            </div>
          </Card>
        </div>
      )}

      {lessonError && !todayLesson && (
        <Card className="text-center py-6 space-y-2">
          <p className="text-sm text-gray-400">Could not prepare today&apos;s lesson.</p>
          <Button size="sm" variant="secondary" onClick={() => void loadToday()}>
            Try again
          </Button>
        </Card>
      )}

      {/* Weekly focus (from the generated weekly plan) */}
      {weekPlan.length > 0 && (
        <div>
          <SectionHeader title="This week's focus" />
          <div className="grid grid-cols-2 gap-3">
            {weekPlan.slice(0, 2).map((week) => (
              <Card key={week.id} className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-500">Week {week.week_number}</span>
                  {week.status === 'active' && <Pill tone="primary">Active</Pill>}
                </div>
                <p className="text-sm font-semibold text-white leading-snug mb-1.5">{week.title}</p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Target className="w-3 h-3" /> {week.focus_skill}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stage timeline */}
      <div>
        <SectionHeader title="Journey" />
        {loading && stages.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 shimmer-bg animate-shimmer rounded-2xl" />
            ))}
          </div>
        ) : (
          <StaggerList className="space-y-2.5" gap={0.05}>
            {stages.map((stage) => (
              <StaggerItem key={stage.id}>
                <StageRow
                  stage={stage}
                  isOpen={expanded === stage.id}
                  onToggle={() => setExpanded((prev) => (prev === stage.id ? null : stage.id))}
                  skillProgress={profileSnapshot.skillProgress}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>

      {/* Lesson modal */}
      <Modal open={lessonOpen} onClose={() => setLessonOpen(false)} title={todayLesson?.title}>
        {todayLesson && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Pill tone="primary">{todayLesson.skill}</Pill>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {todayLesson.duration_minutes} min
              </span>
            </div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto scrollbar-thin">
              {todayLesson.content}
            </div>
            <div className="flex flex-col gap-2">
              {!todayLesson.completed && (
                <Button fullWidth size="lg" onClick={completeLesson}>
                  <CheckCircle2 className="w-4 h-4" /> Mark as complete
                </Button>
              )}
              {todayLesson.vocab && todayLesson.vocab.length > 0 && (
                <Button fullWidth variant="secondary" onClick={() => void saveLessonWords()}>
                  <BookMarked className="w-4 h-4" /> Save these words to my deck
                </Button>
              )}
              <Button
                fullWidth
                variant="secondary"
                onClick={() => {
                  setLessonOpen(false);
                  setFocus({ skill: todayLesson.skill, title: todayLesson.title });
                  onNavigate('chat');
                }}
              >
                Practice this with the tutor
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <CelebrationOverlay
        open={celebrate}
        emoji="🔥"
        title="Lesson complete"
        subtitle="Your progress and the tutor's focus have both been updated."
        onDone={() => setCelebrate(false)}
      />
    </div>
  );
}

/**
 * Reads the generated weekly plan, creating it on first visit.
 *
 * The plan is upserted (migration 3 adds UNIQUE(user_id, week_number)) so two
 * visits cannot create two week 1s, and the statuses are derived from how much
 * time has actually passed — the old version left week 1 'active' forever.
 */
async function ensureWeeklyPlan(
  userId: string,
  currentLevel: CEFRLevel,
  targetLevel: CEFRLevel,
): Promise<LearningPlanWeek[]> {
  const { data } = await supabase
    .from('learning_plan')
    .select('*')
    .eq('user_id', userId)
    .order('week_number', { ascending: true });

  let rows = (data ?? []) as LearningPlanWeek[];

  if (rows.length === 0) {
    const plan = generatePlan(currentLevel, targetLevel);
    const payload = plan.map((week) => ({ ...week, user_id: userId }));
    const { data: created } = await supabase
      .from('learning_plan')
      .upsert(payload, { onConflict: 'user_id,week_number' })
      .select();
    rows = (created ?? []) as LearningPlanWeek[];

    if (rows.length === 0) {
      // The unique index (migration 3) is missing, so the upsert was rejected.
      // A plain insert still works.
      const { data: inserted } = await supabase.from('learning_plan').insert(payload).select();
      rows = (inserted ?? []) as LearningPlanWeek[];
    }
  }

  if (rows.length === 0) return rows;

  // Derive the current week from the plan's own start date.
  const start = new Date(rows[0].created_at).getTime();
  const weeksElapsed = Math.floor((Date.now() - start) / (7 * 24 * 60 * 60 * 1000)) + 1;

  const withStatus = rows.map((row) => {
    const status: LearningPlanWeek['status'] =
      row.week_number < weeksElapsed
        ? 'completed'
        : row.week_number === weeksElapsed
          ? 'active'
          : 'upcoming';
    return { ...row, status };
  });

  // Keep the stored status honest, but only when it actually differs.
  const stale = rows.filter((row, i) => row.status !== withStatus[i].status);
  if (stale.length > 0) {
    await Promise.all(
      stale.map((row) =>
        supabase
          .from('learning_plan')
          .update({ status: withStatus.find((w) => w.week_number === row.week_number)!.status })
          .eq('id', row.id),
      ),
    );
  }

  return withStatus;
}

/** Adds XP for a completed lesson, atomically when the RPC is available. */
async function awardLessonXp(userId: string, amount: number): Promise<void> {
  const { error } = await supabase.rpc('award_xp', { p_amount: amount });
  if (error) {
    // Migration 3 not applied — fall back to a plain increment.
    const { data } = await supabase.from('profiles').select('xp').eq('id', userId).maybeSingle();
    const current = Number(data?.xp);
    if (Number.isFinite(current)) {
      await supabase.from('profiles').update({ xp: current + amount }).eq('id', userId);
    }
  }
}

function StageRow({
  stage,
  isOpen,
  onToggle,
  skillProgress,
}: {
  stage: RoadmapStage;
  isOpen: boolean;
  onToggle: () => void;
  skillProgress: Record<string, number>;
}) {
  const isActive = stage.status === 'active';
  const isDone = stage.status === 'completed';
  const isLocked = stage.status === 'locked';

  return (
    <div
      className={`glass rounded-2xl overflow-hidden transition-colors duration-200 ${
        isActive ? 'border-primary-500/25 bg-primary-500/[0.03]' : isLocked ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex-shrink-0 relative">
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-success-500" />
          ) : isActive ? (
            <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
              <motion.div
                className="w-2 h-2 rounded-full bg-white"
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          ) : isLocked ? (
            <Lock className="w-4.5 h-4.5 text-gray-700" style={{ width: 18, height: 18 }} />
          ) : (
            <Circle className="w-5 h-5 text-gray-700" />
          )}
          {isActive && (
            <span className="absolute -inset-1.5 rounded-full border border-primary-500/30 animate-pulse-ring" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-600 font-medium">
              Stage {stage.order + 1}
            </span>
            <span className="text-[11px] text-gray-700">
              {stage.levelRange[0]}–{stage.levelRange[1]}
            </span>
            {isActive && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-400 font-semibold">
                ACTIVE
              </span>
            )}
          </div>
          <p className={`text-sm font-semibold truncate ${isDone ? 'text-gray-500' : 'text-white'}`}>
            {stage.name}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isLocked && (
            <span className={`text-xs font-bold tabular-nums ${isDone ? 'text-success-500' : 'text-primary-400'}`}>
              {stage.progress}%
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <Collapse open={isOpen}>
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.05] space-y-3.5">
          <p className="text-sm text-gray-400 leading-relaxed pt-3">{stage.summary}</p>

          {!isLocked && (
            <div className="space-y-2.5">
              {stage.skills.map((skill) => (
                <SkillRow
                  key={skill}
                  skill={skill}
                  value={skillProgress[skill] ?? 0}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-[11px] text-gray-500 pt-1">
            <span className="flex items-center gap-1">
              <Map className="w-3 h-3" /> {stage.lessonsTarget} lessons
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" /> {stage.questsTarget} quests
            </span>
          </div>

          <p className="text-[11px] text-gray-600 leading-relaxed">
            {isDone
              ? 'Stage cleared. The skills above stay in rotation so they do not regress.'
              : isActive
                ? 'This is where you are now. Lessons and quests in this stage move it forward.'
                : 'Locked. Reach the level range above to unlock this stage.'}
          </p>
        </div>
      </Collapse>
    </div>
  );
}
