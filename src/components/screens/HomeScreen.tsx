import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTutor } from '@/context/TutorContext';
import { useNotifications } from '@/context/NotificationContext';
import { supabase } from '@/lib/supabase';
import { getLessonForLevel } from '@/lib/lessonData';
import { buildRoadmap, currentStage } from '@/lib/learning/roadmap';
import { todayKey } from '@/lib/learning/profile';
import { useDailyQuests } from '@/lib/learning/useDailyQuests';
import type { ConversationMessage, DailyLesson } from '@/lib/types';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EASE } from '@/components/ui/motionTokens';
import { PageHeader, Pill, SectionHeader, SkillRow, StatCard } from '@/components/ui/primitives';
import type { TabId } from '@/components/Layout';

interface HomeProps {
  onNavigate: (tab: TabId) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const { profile, user, refreshProfile } = useAuth();
  const { profileSnapshot, setFocus } = useTutor();
  const { updateContext } = useNotifications();
  const [todayLesson, setTodayLesson] = useState<DailyLesson | null>(null);
  const [lastMessage, setLastMessage] = useState<ConversationMessage | null>(null);
  const [lastSessionAt, setLastSessionAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const date = todayKey();
  const quests = useDailyQuests(user?.id ?? null);

  const loadTodayLesson = useCallback(async () => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('daily_lessons')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle();

    if (existing) {
      setTodayLesson(existing as DailyLesson);
      return;
    }

    const lesson = getLessonForLevel(profile?.current_level ?? 'A1');
    const { data: created } = await supabase
      .from('daily_lessons')
      .insert({
        user_id: user.id,
        date,
        title: lesson.title,
        skill: lesson.skill,
        content: lesson.content,
        duration_minutes: lesson.durationMinutes,
      })
      .select()
      .single();

    setTodayLesson(created ? (created as DailyLesson) : null);
  }, [user, date, profile?.current_level]);

  const loadLastMessage = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conversation_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setLastMessage(data as ConversationMessage);
      setLastSessionAt(new Date(data.created_at));
    }
  }, [user]);

  const updateStreak = useCallback(async () => {
    if (!user || !profile) return;
    const today = todayKey();
    if (profile.last_active_date === today) return;

    const yesterday = todayKey(new Date(Date.now() - 86400000));
    const newStreak = profile.last_active_date === yesterday ? profile.streak + 1 : 1;

    await supabase
      .from('profiles')
      .update({ streak: newStreak, last_active_date: today })
      .eq('id', user.id);
    await refreshProfile();
  }, [user, profile, refreshProfile]);

  useEffect(() => {
    void (async () => {
      await Promise.all([loadTodayLesson(), loadLastMessage(), updateStreak()]);
      setLoading(false);
    })();
  }, [loadTodayLesson, loadLastMessage, updateStreak]);

  // Keep the reminder scheduler informed about the real learning state.
  useEffect(() => {
    updateContext({
      streak: profile?.streak ?? 0,
      incompleteQuests: quests.quests.length - quests.completedCount,
      lastSessionAt,
      lessonTitle: todayLesson?.title ?? null,
    });
  }, [updateContext, profile?.streak, quests.quests.length, quests.completedCount, lastSessionAt, todayLesson?.title]);

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
  const activeStage = currentStage(stages);

  const questProgress =
    quests.quests.length > 0 ? (quests.completedCount / quests.quests.length) * 100 : 0;
  const dayProgress = Math.round((questProgress + (todayLesson?.completed ? 100 : 0)) / 2);

  const focusSkills = profileSnapshot.weaknesses.length > 0
    ? profileSnapshot.weaknesses
    : activeStage?.skills.slice(0, 2) ?? [];

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-4">
        <div className="h-40 shimmer-bg animate-shimmer rounded-2xl" />
        <div className="h-24 shimmer-bg animate-shimmer rounded-2xl" />
        <div className="h-24 shimmer-bg animate-shimmer rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader
        title={greetingLine()}
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      />

      {/* Hero: today + streak + stage */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: EASE }}>
        <Card className="relative overflow-hidden">
          <div className="aurora" />
          <div className="relative flex items-center gap-5">
            <ProgressRing
              progress={dayProgress}
              size={112}
              strokeWidth={8}
              label={`${dayProgress}%`}
              sublabel="Today"
              gradientId="homeRing"
            />
            <div className="flex-1 min-w-0 space-y-2.5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-gray-300">
                  <span className="font-bold text-white">{profile?.streak || 0}</span> day streak
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-accent-400" />
                <span className="text-sm text-gray-300">
                  <span className="font-bold text-white">{profile?.current_level ?? 'A1'}</span>
                  <span className="text-gray-600"> → {profile?.target_level ?? 'B2'}</span>
                </span>
              </div>
              {activeStage && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success-400" />
                  <span className="text-sm text-gray-300 truncate">{activeStage.name}</span>
                </div>
              )}
              <Button size="sm" variant="secondary" onClick={() => onNavigate('progress')}>
                View Progress <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Daily quests */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE, delay: 0.05 }}
      >
        <SectionHeader
          title="Daily quests"
          action={
            <button
              onClick={() => onNavigate('quests')}
              className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
            >
              All quests <ArrowRight className="w-3 h-3" />
            </button>
          }
        />
        <Card hover onClick={() => onNavigate('quests')} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-white">
                {quests.completedCount}/{quests.quests.length} complete
              </span>
            </div>
            <span className="text-xs font-bold text-primary-400 tabular-nums flex-shrink-0">
              {quests.earnedXp} XP
            </span>
          </div>
          <ProgressBar progress={questProgress} label="Daily quest progress" />
          {quests.quests.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {quests.quests.map((quest) => (
                <Pill
                  key={quest.id}
                  tone={quest.completed ? 'success' : 'neutral'}
                >
                  {quest.completed && <CheckCircle2 className="w-2.5 h-2.5" />}
                  {quest.title}
                </Pill>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Your quests will appear once you sign in.</p>
          )}
        </Card>
      </motion.div>

      {/* Today's lesson */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE, delay: 0.1 }}
      >
        <SectionHeader title="Today's lesson" />
        {todayLesson ? (
          <Card
            hover
            onClick={() => {
              setFocus({ skill: todayLesson.skill, title: todayLesson.title });
              onNavigate('roadmap');
            }}
            className="space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Pill tone="primary">{todayLesson.skill}</Pill>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {todayLesson.duration_minutes} min
                  </span>
                </div>
                <h3 className="text-base font-bold text-white font-sans">{todayLesson.title}</h3>
              </div>
              {todayLesson.completed ? (
                <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-[18px] h-[18px] text-primary-400" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className={`text-xs font-medium ${todayLesson.completed ? 'text-success-400' : 'text-primary-400'}`}>
                {todayLesson.completed ? 'Completed' : 'Start lesson'}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-gray-500 text-center py-4">No lesson generated yet.</p>
          </Card>
        )}
      </motion.div>

      {/* Focus skills */}
      {focusSkills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE, delay: 0.15 }}
        >
          <SectionHeader
            title="Where the tutor is focusing"
            action={<Sparkles className="w-3.5 h-3.5 text-gray-600" />}
          />
          <Card className="space-y-3.5">
            {focusSkills.map((skill) => (
              <SkillRow key={skill} skill={skill} value={profileSnapshot.skillProgress[skill]} />
            ))}
            <p className="text-[11px] text-gray-500 leading-relaxed pt-0.5">
              {profileSnapshot.weaknesses.length > 0
                ? 'Your quests, lessons, and the tutor\'s questions are all weighted toward these right now.'
                : 'Tracking your weakest skills here as more evidence comes in.'}
            </p>
          </Card>
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE, delay: 0.2 }}
      >
        <SectionHeader title="Quick actions" />
        <div className="grid grid-cols-2 gap-3">
          <Card hover onClick={() => onNavigate('chat')} className="flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <MessageCircle className="w-[18px] h-[18px] text-accent-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Chat with Emo</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {lastMessage ? 'Continue conversation' : 'Start practicing'}
              </p>
            </div>
          </Card>
          <Card hover onClick={() => onNavigate('roadmap')} className="flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <GraduationCap className="w-[18px] h-[18px] text-primary-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Roadmap</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">Your journey stage</p>
            </div>
          </Card>
          <Card hover onClick={() => onNavigate('progress')} className="flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-success-500/10 flex items-center justify-center">
              <TrendingUp className="w-[18px] h-[18px] text-success-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Skills</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">Per-skill breakdown</p>
            </div>
          </Card>
          <Card hover onClick={() => onNavigate('appointments')} className="flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-warning-500/10 flex items-center justify-center">
              <Calendar className="w-[18px] h-[18px] text-warning-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Schedule</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">Add a reminder</p>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Recent chat */}
      {lastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE, delay: 0.25 }}
        >
          <SectionHeader title="Recent chat" />
          <Card hover onClick={() => onNavigate('chat')}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">E</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">Emo</p>
                <p className="text-sm text-gray-300 line-clamp-2">{lastMessage.content}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Compact stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE, delay: 0.3 }}
        className="grid grid-cols-3 gap-3"
      >
        <StatCard
          icon={BookOpen}
          label="Lessons"
          value={String(profileSnapshot.completedLessons)}
          tone="accent"
        />
        <StatCard
          icon={Target}
          label="Quests"
          value={String(profileSnapshot.completedQuests)}
          tone="primary"
        />
        <StatCard
          icon={Sparkles}
          label="XP"
          value={String(profileSnapshot.xp)}
          tone="warning"
        />
      </motion.div>
    </div>
  );
}

function greetingLine(): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return `${part}, ready to learn?`;
}
