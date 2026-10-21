import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  Flame,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  availableChallengeXp,
  buildChallenges,
  leagueForXp,
  streakState,
  STREAK_FREEZE_COST,
  type ChallengeKind,
} from '@/lib/learning/challenges';
import { todayKey } from '@/lib/learning/profile';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, Pill, SectionHeader } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EASE } from '@/components/ui/motionTokens';

const challengeIcons = {
  book: BookOpen,
  target: Target,
  refresh: RefreshCw,
  cards: Sparkles,
  flame: Flame,
} as const;

export function ChallengesScreen() {
  const { profile, refreshProfile } = useAuth();
  const [lessons, setLessons] = useState(0);
  const [quests, setQuests] = useState(0);
  const [reviews, setReviews] = useState(0);
  const [words, setWords] = useState(0);
  const [weeklyXp, setWeeklyXp] = useState(0);
  const [claimed, setClaimed] = useState<ChallengeKind[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const weekStart = useMemo(() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7; // Monday
    d.setDate(d.getDate() - day);
    return todayKey(d);
  }, []);

  const load = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const since = todayKey(weekAgo);

    const [lessonRows, questRows, reviewRows, wordRows, xpRows, challengeRows] = await Promise.all([
      supabase
        .from('daily_lessons')
        .select('id, completed')
        .eq('user_id', profile.id)
        .eq('completed', true)
        .gte('date', since),
      supabase
        .from('daily_quests')
        .select('id, completed')
        .eq('user_id', profile.id)
        .eq('completed', true)
        .gte('date', since),
      supabase
        .from('xp_events')
        .select('id')
        .eq('user_id', profile.id)
        .eq('source', 'review')
        .gte('created_at', `${since}T00:00:00Z`),
      supabase
        .from('vocabulary')
        .select('id, mastered')
        .eq('user_id', profile.id)
        .eq('mastered', true),
      supabase
        .from('xp_events')
        .select('amount')
        .eq('user_id', profile.id)
        .gte('created_at', `${since}T00:00:00Z`),
      supabase
        .from('challenges')
        .select('kind, claimed_at')
        .eq('user_id', profile.id)
        .eq('week_start', weekStart),
    ]);

    setLessons(lessonRows.data?.length ?? 0);
    setQuests(questRows.data?.length ?? 0);
    setReviews(reviewRows.data?.length ?? 0);
    setWords(wordRows.data?.length ?? 0);
    setWeeklyXp((xpRows.data ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
    setClaimed(
      (challengeRows.data ?? [])
        .filter((row) => row.claimed_at)
        .map((row) => row.kind as ChallengeKind),
    );
    setLoading(false);
  }, [profile?.id, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const challenges = useMemo(
    () =>
      buildChallenges({
        lessonsCompleted: lessons,
        questsCompleted: quests,
        reviewSessions: reviews,
        wordsMastered: words,
        xpEarned: weeklyXp,
        streak: profile?.streak ?? 0,
        claimedKinds: claimed,
      }),
    [lessons, quests, reviews, words, weeklyXp, profile?.streak, claimed],
  );

  const league = leagueForXp(weeklyXp);
  const claimable = availableChallengeXp(challenges);
  const streak = streakState(
    profile?.last_active_date ?? null,
    todayKey(),
    profile?.streak_freezes ?? 0,
  );

  async function claim(kind: ChallengeKind) {
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.rpc('claim_challenge', {
      p_kind: kind,
      p_week_start: weekStart,
    });
    if (error) {
      setNotice('The reward could not be claimed yet. Finish the challenge first.');
    } else {
      setNotice('Reward claimed. The XP is in your total.');
      await load();
      await refreshProfile();
    }
    setBusy(false);
  }

  async function applyFreeze() {
    if (!profile?.id) return;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        streak_freezes: Math.max(0, (profile.streak_freezes ?? 0) - 1),
        last_active_date: todayKey(),
      })
      .eq('id', profile.id);
    setNotice(
      error
        ? 'The freeze could not be applied.'
        : 'Streak protected. Keep going — you have the XP to spare.',
    );
    if (!error) await refreshProfile();
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-4">
        <div className="h-32 shimmer-bg animate-shimmer rounded-2xl" />
        <div className="h-24 shimmer-bg animate-shimmer rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader
        title="Weekly league"
        subtitle="Challenges, XP and the tier you are in this week"
      />

      {notice && (
        <div className="text-xs text-primary-300 bg-primary-500/8 border border-primary-500/20 rounded-xl px-3.5 py-2.5">
          {notice}
        </div>
      )}

      {/* League */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE }}
      >
        <Card hairline depth={3} className="relative overflow-hidden space-y-3">
          <div className="aurora opacity-70" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">League</p>
                <p className="text-2xl font-extrabold text-white font-sans text-3d mt-0.5">
                  {league.name}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warning-500/30 to-warning-500/5 border border-warning-500/25 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-warning-300" />
              </div>
            </div>
            <ProgressBar progress={league.progress} height="md" label="League progress" />
            <p className="text-[11px] text-gray-500">
              {league.next
                ? `${weeklyXp} XP this week · ${league.toNext} XP to ${league.next}`
                : `${weeklyXp} XP this week · top tier reached`}
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Challenges */}
      <div>
        <SectionHeader
          title="This week's challenges"
          action={
            claimable > 0 ? (
              <Pill tone="warning">
                <Zap className="w-2.5 h-2.5" /> {claimable} XP to claim
              </Pill>
            ) : undefined
          }
        />
        <div className="space-y-2.5">
          {challenges.map((challenge) => {
            const Icon = challengeIcons[challenge.definition.icon];
            const percent = (challenge.progress / challenge.definition.target) * 100;
            return (
              <Card key={challenge.definition.kind} className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                      challenge.complete
                        ? 'bg-success-500/12 border-success-500/25'
                        : 'bg-white/[0.05] border-white/[0.07]'
                    }`}
                  >
                    {challenge.claimed ? (
                      <Check className="w-4 h-4 text-success-300" />
                    ) : (
                      <Icon
                        className={`w-4 h-4 ${
                          challenge.complete ? 'text-success-300' : 'text-gray-500'
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      {challenge.definition.title}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {challenge.definition.description}
                    </p>
                  </div>
                  {challenge.claimed ? (
                    <Pill tone="success">Claimed</Pill>
                  ) : challenge.complete ? (
                    <Button size="sm" loading={busy} onClick={() => void claim(challenge.definition.kind)}>
                      +{challenge.definition.rewardXp}
                    </Button>
                  ) : (
                    <span className="text-[11px] text-gray-500 tabular-nums">
                      {challenge.progress}/{challenge.definition.target}
                    </span>
                  )}
                </div>
                <ProgressBar
                  progress={percent}
                  tone={challenge.complete ? 'success' : 'primary'}
                  height="sm"
                  label={challenge.definition.title}
                />
              </Card>
            );
          })}
        </div>
      </div>

      {/* Streak */}
      <div>
        <SectionHeader title="Streak" />
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/12 border border-primary-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">
                {profile?.streak ?? 0} day streak
              </p>
              <p className="text-[11px] text-gray-500">
                {streak.alive
                  ? 'Alive — practise today to keep it.'
                  : streak.broken
                    ? 'Broken. A freeze can save it.'
                    : 'Start a streak with one lesson today.'}
              </p>
            </div>
            <span className="text-[11px] text-gray-500 tabular-nums">
              {profile?.streak_freezes ?? 0} freezes
            </span>
          </div>

          {streak.broken && streak.canFreeze && (
            <Button
              fullWidth
              variant="secondary"
              loading={busy}
              onClick={() => void applyFreeze()}
            >
              <Lock className="w-4 h-4" /> Protect the streak for {STREAK_FREEZE_COST} XP
            </Button>
          )}
          {streak.broken && !streak.canFreeze && (
            <p className="text-[11px] text-gray-500 leading-relaxed">
              No freezes left. A new streak starts with the next lesson — and the league
              depends on this week, not on one perfect run.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
