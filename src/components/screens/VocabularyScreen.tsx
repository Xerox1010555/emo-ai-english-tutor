import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookMarked,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  gradeVocab,
  intervalForBox,
  loadDueVocab,
  loadVocabDeck,
  saveVocab,
} from '@/lib/learning/vocab';
import type { VocabItem } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, EmptyState, SectionHeader, StatCard } from '@/components/ui/primitives';
import { EASE } from '@/components/ui/motionTokens';
import type { TabId } from '@/components/Layout';

interface VocabularyScreenProps {
  onNavigate: (tab: TabId) => void;
}

type Phase = 'browse' | 'review';

export function VocabularyScreen({ onNavigate }: VocabularyScreenProps) {
  const { user } = useAuth();
  const [deck, setDeck] = useState<VocabItem[]>([]);
  const [due, setDue] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('browse');
  const [revealed, setRevealed] = useState(false);
  const [session, setSession] = useState<VocabItem[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ word: '', definition: '', example: '' });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const [all, dueToday] = await Promise.all([loadVocabDeck(user.id), loadDueVocab(user.id)]);
    setDeck(all);
    setDue(dueToday);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  function startSession() {
    if (due.length === 0) return;
    setSession(due);
    setSessionIndex(0);
    setRevealed(false);
    setPhase('review');
  }

  async function grade(passed: boolean) {
    const card = session[sessionIndex];
    if (!card) return;

    const result = await gradeVocab(user?.id ?? '', card, passed);
    if (result === 'error') {
      setError('Could not save that review. Try again.');
      return;
    }

    if (sessionIndex + 1 < session.length) {
      setSessionIndex((i) => i + 1);
      setRevealed(false);
    } else {
      setPhase('browse');
      await load();
    }
  }

  async function addWord() {
    if (!user) return;
    if (!draft.word.trim() || !draft.definition.trim()) {
      setError('A word and a definition are required.');
      return;
    }
    setError(null);
    const result = await saveVocab(user.id, { ...draft, source: 'manual' });
    if (result === 'saved') {
      setDraft({ word: '', definition: '', example: '' });
      setAdding(false);
      setNotice('Added to your deck.');
      await load();
    } else if (result === 'duplicate') {
      setNotice('That word is already in your deck.');
    } else {
      setError('Could not add that word.');
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
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 shimmer-bg animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  // --- Review session ---
  if (phase === 'review') {
    const card = session[sessionIndex];
    if (!card) {
      setPhase('browse');
      return null;
    }
    const progress = ((sessionIndex + 1) / session.length) * 100;

    return (
      <div className="px-5 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPhase('browse')}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to deck
          </button>
          <span className="text-[11px] text-gray-500 tabular-nums">
            {sessionIndex + 1} / {session.length}
          </span>
        </div>

        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: EASE }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <Card className="space-y-4 text-center py-8">
              <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
                Say it in English
              </p>
              <h2 className="text-3xl font-extrabold text-white font-sans">{card.word}</h2>
              <button
                onClick={() => speak(card.word)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-400 transition-colors"
                aria-label="Play pronunciation"
              >
                <Volume2 className="w-3.5 h-3.5" /> Listen
              </button>

              {revealed ? (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-gray-300 leading-relaxed">{card.definition}</p>
                  <p className="text-xs text-gray-500 italic leading-relaxed">"{card.example}"</p>
                  <p className="text-[11px] text-gray-600">
                    Box {card.box} · next review in {intervalForBox(card.box)} day(s)
                  </p>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setRevealed(true)}>
                  Reveal
                </Button>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

        {revealed && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => void grade(false)}>
              <RotateCcw className="w-4 h-4" /> Again
            </Button>
            <Button onClick={() => void grade(true)}>
              <Check className="w-4 h-4" /> Got it
            </Button>
          </div>
        )}
      </div>
    );
  }

  // --- Deck ---
  const mastered = deck.filter((v) => v.mastered).length;

  return (
    <div className="px-5 py-6 space-y-6">
      <PageHeader
        title="Vocabulary"
        subtitle="Words you are learning, reviewed with spaced repetition"
        action={
          <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        }
      />

      {(notice || error) && (
        <div
          className={`text-xs rounded-xl px-3.5 py-2.5 border ${
            error
              ? 'text-red-400 bg-red-950/30 border-red-900/30'
              : 'text-success-400 bg-success-500/5 border-success-500/15'
          }`}
        >
          {error ?? notice}
        </div>
      )}

      {adding && (
        <Card className="space-y-3">
          <input
            type="text"
            value={draft.word}
            onChange={(e) => setDraft((d) => ({ ...d, word: e.target.value }))}
            placeholder="Word"
            className="w-full px-4 py-2.5 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40"
          />
          <input
            type="text"
            value={draft.definition}
            onChange={(e) => setDraft((d) => ({ ...d, definition: e.target.value }))}
            placeholder="Definition"
            className="w-full px-4 py-2.5 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40"
          />
          <input
            type="text"
            value={draft.example}
            onChange={(e) => setDraft((d) => ({ ...d, example: e.target.value }))}
            placeholder="Example sentence (optional)"
            className="w-full px-4 py-2.5 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40"
          />
          <Button fullWidth onClick={() => void addWord()}>
            <Plus className="w-4 h-4" /> Add to deck
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={BookMarked} label="Words" value={String(deck.length)} tone="primary" />
        <StatCard icon={Sparkles} label="Due now" value={String(due.length)} tone="accent" />
        <StatCard icon={Check} label="Mastered" value={String(mastered)} tone="success" />
      </div>

      {due.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{due.length} due for review</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Short session, strong retention. Leitner boxes, 1 → 30 day intervals.
              </p>
            </div>
          </div>
          <Button fullWidth onClick={startSession}>
            <ChevronRight className="w-4 h-4" /> Start review
          </Button>
        </Card>
      )}

      <div>
        <SectionHeader title="Your deck" />
        {deck.length === 0 ? (
          <Card>
            <EmptyState
              icon={BookMarked}
              title="No words yet"
              body="Add words here, or save the words from a lesson into your deck."
              action={
                <Button size="sm" variant="secondary" onClick={() => onNavigate('roadmap')}>
                  Open today's lesson
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {deck.map((item) => (
              <Card key={item.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{item.word}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.definition}</p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      Box {item.box} · {item.mastered ? 'mastered' : `next ${item.next_review}`}
                    </p>
                  </div>
                  <button
                    onClick={() => speak(item.word)}
                    aria-label={`Play ${item.word}`}
                    className="p-2 rounded-lg hover:bg-white/5 text-gray-600 hover:text-primary-400 transition-colors flex-shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
