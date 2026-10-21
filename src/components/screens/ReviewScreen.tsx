import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  BookMarked,
  Check,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTutor } from '@/context/TutorContext';
import { supabase } from '@/lib/supabase';
import { buildReviewQueue, reviewXp, xpLevel, type ReviewItem } from '@/lib/learning/review';
import { loadDueVocab } from '@/lib/learning/vocab';
import type { VocabItem } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, Pill, SectionHeader } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EASE } from '@/components/ui/motionTokens';

export function ReviewScreen() {
  const { user, profile } = useAuth();
  const { profileSnapshot, refreshSnapshot } = useTutor();
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState('');
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null);
  const [earned, setEarned] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xp, setXp] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const [mistakesRes, vocab, profileRow] = await Promise.all([
      supabase
        .from('recurring_mistakes')
        .select('label, category, occurrences')
        .eq('user_id', user.id)
        .order('occurrences', { ascending: false })
        .limit(8),
      loadDueVocab(user.id),
      supabase.from('profiles').select('xp').eq('id', user.id).maybeSingle(),
    ]);

    const mistakes = (mistakesRes.data ?? []) as {
      label: string;
      category: string;
      occurrences: number;
    }[];

    setQueue(
      buildReviewQueue({
        mistakes,
        vocabulary: vocab as VocabItem[],
        weakSkills: profileSnapshot.weaknesses,
        level: profile?.current_level ?? 'A1',
        limit: 10,
      }),
    );
    setXp(Number(profileRow.data?.xp) || 0);
    setLoading(false);
  }, [user, profile?.current_level, profileSnapshot.weaknesses]);

  useEffect(() => {
    void load();
  }, [load]);

  const item = queue[index] ?? null;
  const level = useMemo(() => xpLevel(xp), [xp]);

  function resetItem() {
    setSelected(null);
    setRevealed(false);
    setTyped('');
    setVerdict(null);
  }

  async function grade(correct: boolean) {
    if (!item) return;
    setVerdict(correct ? 'correct' : 'wrong');

    const gained = reviewXp(item, correct);
    if (gained > 0) {
      setEarned((total) => total + gained);
      // The XP is added by an atomic database function (migration 3) — a
      // read-modify-write from the client would lose points when two items
      // are graded at once.
      const { data: newXp } = await supabase.rpc('award_xp', { p_amount: gained });
      if (typeof newXp === 'number' && newXp > 0) setXp(newXp);
      else setXp((total) => total + gained);
    }
  }

  function advance() {
    resetItem();
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
    } else {
      setFinished(true);
      void refreshSnapshot();
    }
  }

  function speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-4">
        <div className="h-28 shimmer-bg animate-shimmer rounded-2xl" />
        <div className="h-48 shimmer-bg animate-shimmer rounded-2xl" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="px-5 py-6 space-y-6">
        <PageHeader
          title="Review"
          subtitle="A short session built from your mistakes, your words and your weak skills"
        />
        <Card className="text-center py-12 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success-500/20 to-transparent border border-success-500/20 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-success-300" />
          </div>
          <p className="text-sm font-semibold text-white">Nothing to review right now</p>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            Do a lesson or a chat session, and your review queue will fill up with the things you
            actually struggle with.
          </p>
        </Card>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="px-5 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <Card hairline depth={3} className="relative overflow-hidden text-center py-12 space-y-4">
            <div className="aurora opacity-80" />
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center mx-auto shadow-glow-primary">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold text-white font-sans text-3d mt-4">
                Review complete
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                You earned <span className="text-primary-300 font-bold">+{earned} XP</span> and you are
                now level {level.current.level} — {level.current.title}.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button onClick={() => {
                  void load();
                  setIndex(0);
                  setFinished(false);
                  setEarned(0);
                  resetItem();
                }}>
                  <RotateCcw className="w-4 h-4" /> Another round
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader
        title="Review"
        subtitle="A short session built from your mistakes, your words and your weak skills"
      />

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {index + 1} / {queue.length}
          </span>
          <span className="text-primary-300 font-bold tabular-nums">+{earned} XP</span>
        </div>
        <ProgressBar progress={(index / queue.length) * 100} label="Review progress" />
      </div>

      {/* The item */}
      <AnimatePresence mode="wait">
        <motion.div
          key={item?.id}
          initial={{ opacity: 0, x: 40, rotateY: -6 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          exit={{ opacity: 0, x: -40, rotateY: 6 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <Card hairline depth={3} tilt className="relative overflow-hidden space-y-4">
            <div className="flex items-center gap-2">
              {item?.kind === 'mistake' && (
                <>
                  <Pill tone="warning">
                    <AlertCircle className="w-2.5 h-2.5" /> Mistake
                  </Pill>
                  <span className="text-[11px] text-gray-500">
                    seen {item.occurrences}×
                  </span>
                </>
              )}
              {item?.kind === 'vocabulary' && (
                <Pill tone="accent">
                  <BookMarked className="w-2.5 h-2.5" /> Word
                </Pill>
              )}
              {item?.kind === 'question' && (
                <Pill tone="primary">
                  <Target className="w-2.5 h-2.5" /> {item.skill}
                </Pill>
              )}
            </div>

            {item?.kind === 'mistake' && (
              <div className="space-y-3">
                <p className="text-base text-gray-100 leading-relaxed">{item.prompt}</p>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Type the corrected version"
                  className="w-full px-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40 transition-colors"
                />
                {verdict && (
                  <p
                    className={`text-xs rounded-xl px-3 py-2 ${
                      verdict === 'correct'
                        ? 'text-success-300 bg-success-500/10 border border-success-500/20'
                        : 'text-warning-300 bg-warning-500/10 border border-warning-500/20'
                    }`}
                  >
                    {verdict === 'correct'
                      ? 'Correct — that mistake is fading.'
                      : 'Not quite. Try to use it in a sentence next time.'}
                  </p>
                )}
              </div>
            )}

            {item?.kind === 'vocabulary' && (
              <div className="space-y-3 text-center py-2">
                <p className="text-xs font-semibold text-primary-300 uppercase tracking-[0.14em]">
                  Say it in English
                </p>
                <h3 className="text-3xl font-extrabold text-white font-sans text-3d">
                  {item.word}
                </h3>
                <button
                  onClick={() => speak(item.word)}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-400 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Listen
                </button>

                {revealed && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-sm text-gray-200">{item.definition}</p>
                    <p className="text-xs text-gray-500 italic">&ldquo;{item.example}&rdquo;</p>
                  </div>
                )}
              </div>
            )}

            {item?.kind === 'question' && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white leading-snug">{item.question}</h3>
                <div className="space-y-2">
                  {item.options.map((option, i) => {
                    const isCorrect = i === item.correct;
                    const isSelected = selected === i;
                    let cls = 'glass border-white/[0.06] text-gray-300';
                    if (verdict) {
                      if (isCorrect) cls = 'bg-success-500/15 border-success-500/40 text-white';
                      else if (isSelected) cls = 'bg-red-500/15 border-red-500/40 text-white';
                      else cls = 'glass border-white/[0.04] text-gray-600';
                    } else if (isSelected) {
                      cls = 'bg-primary-500/15 border-primary-500/50 text-white';
                    }
                    return (
                      <button
                        key={i}
                        disabled={!!verdict}
                        onClick={() => {
                          setSelected(i);
                          void grade(isCorrect);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${cls}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {verdict && (
                  <p className="text-xs text-gray-400 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 leading-relaxed">
                    {item.explanation}
                  </p>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex gap-2">
        {item?.kind === 'vocabulary' && !verdict && (
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              setRevealed(true);
              void grade(true);
            }}
          >
            <Sparkles className="w-4 h-4" /> Reveal
          </Button>
        )}
        {item?.kind === 'mistake' && !verdict && (
          <Button fullWidth onClick={() => void grade(typed.trim().length > 2)}>
            <Check className="w-4 h-4" /> Check
          </Button>
        )}
        {verdict && (
          <>
            {verdict === 'wrong' && (
              <Button
                fullWidth
                variant="secondary"
                onClick={() => void grade(true)}
                disabled={item?.kind === 'question'}
              >
                <X className="w-4 h-4" /> I knew it
              </Button>
            )}
            <Button fullWidth onClick={advance}>
              <Zap className="w-4 h-4" /> Continue
            </Button>
          </>
        )}
      </div>

      {/* Level progress */}
      <div>
        <SectionHeader title="Your level" />
        <Card className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              Level {level.current.level} · {level.current.title}
            </span>
            <span className="text-xs text-gray-500 tabular-nums">{xp} XP</span>
          </div>
          <ProgressBar progress={level.progress} label="Level progress" />
          <p className="text-[11px] text-gray-500">
            {level.next
              ? `${level.toNext} XP to reach ${level.next.title}.`
              : 'Top level reached. Nothing left to unlock.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
