import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { placementBank } from '@/lib/placementData';
import {
  abilityBand,
  chooseNextItem,
  levelForAbility,
  summarise,
  targetItemCount,
  updateAbility,
  type PlacementAnswer,
  type PlacementItem,
} from '@/lib/learning/placement';
import { speakingAttemptPassed, scoreSpeaking, speakingVerdict } from '@/lib/learning/speech';
import type { CEFRLevel, Skill } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Check, GraduationCap, ChevronRight, Mic, Play, PenLine, Volume2 } from 'lucide-react';

interface PlacementTestProps {
  onComplete: (results: {
    level: CEFRLevel;
    /** Only the skills that were actually measured. */
    skillScores: Partial<Record<Skill, number>>;
  }) => void;
}

export function PlacementTest({ onComplete }: PlacementTestProps) {
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [ability, setAbility] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [written, setWritten] = useState('');
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [speechScore, setSpeechScore] = useState<ReturnType<typeof scoreSpeaking> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const capabilities = useMemo(
    () => ({
      tts: typeof window !== 'undefined' && 'speechSynthesis' in window,
      stt:
        typeof window !== 'undefined' &&
        Boolean(
          (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ??
            (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
        ),
    }),
    [],
  );

  const item = useMemo<PlacementItem | null>(() => {
    if (finished) return null;
    return chooseNextItem(placementBank, answers, ability);
  }, [answers, ability, finished]);

  // A listening item needs speech synthesis; a speaking item needs recognition.
  // When the browser cannot do it, the item is skipped instead of counted wrong.
  const isSkippable =
    !!item &&
    ((item.kind === 'listening' && !capabilities.tts) ||
      (item.kind === 'speaking' && !capabilities.stt));

  useEffect(() => {
    setSelected(null);
    setWritten('');
    setTranscript('');
    setSpeechScore(null);
    setVoiceError(null);
  }, [item?.id]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  const budget = targetItemCount(answers.length, answers.filter((a) => a.correct).length);
  const progress = Math.min(100, (answers.length / Math.max(budget, 1)) * 100);

  function playSentence(text: string) {
    if (!capabilities.tts) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    utterance.onstart = () => setListening(true);
    utterance.onend = () => setListening(false);
    utterance.onerror = () => setListening(false);
    window.speechSynthesis.speak(utterance);
  }

  function startRecording() {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    if (!SR) {
      setVoiceError('Voice input is not available in this browser.');
      return;
    }
    try {
      const recognition = new SR();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
        setRecording(false);
        if (item?.kind === 'speaking') {
          setSpeechScore(scoreSpeaking(item.target ?? '', text));
        }
      };
      recognition.onerror = () => {
        setRecording(false);
        setVoiceError('Could not hear you. Try again, or skip this one.');
      };
      recognition.onend = () => setRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
      setVoiceError(null);
    } catch {
      setRecording(false);
      setVoiceError('Could not start the microphone.');
    }
  }

  function evaluateCurrent(): boolean {
    if (!item || isSkippable) return false;

    if (item.kind === 'writing') {
      const words = written.trim().split(/\s+/).filter(Boolean);
      const minWords = item.minWords ?? 5;
      const hasKeyword = item.keyword
        ? written.toLowerCase().includes(item.keyword.toLowerCase())
        : true;
      return words.length >= minWords && hasKeyword;
    }

    if (item.kind === 'speaking') {
      if (!transcript.trim()) return false;
      return speakingAttemptPassed(item.target ?? '', transcript);
    }

    if (selected === null) return false;
    return selected === item.correct;
  }

  function handleNext() {
    if (!item) return;

    const correct = evaluateCurrent();
    const nextAnswers = [...answers, { item, correct }];
    const nextAbility = updateAbility(ability, nextAnswers, item, correct);
    const nextBudget = targetItemCount(
      nextAnswers.length,
      nextAnswers.filter((a) => a.correct).length,
    );

    setAnswers(nextAnswers);
    setAbility(nextAbility);

    const outcome = summarise(nextAnswers, nextAbility);
    // Stop when the estimate has settled, or when the budget is spent.
    if (outcome.settled || nextAnswers.length >= nextBudget) {
      setFinished(true);
      const final = summarise(nextAnswers, nextAbility);
      onComplete({ level: final.level, skillScores: final.skillScores });
      return;
    }

    setSelected(null);
    setWritten('');
    setTranscript('');
  }

  if (!item && !finished) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Preparing your test…</p>
      </div>
    );
  }

  const band = abilityBand(ability);

  return (
    <div className="min-h-screen flex flex-col scene">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-down">
          <div className="w-10 h-10 rounded-xl glass-panel depth-2 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white text-3d">Placement Test</h1>
            <p className="text-xs text-gray-500">
              Question {answers.length + 1} · this test adapts to you
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Now</p>
            <p className="text-sm font-bold text-primary-300">{levelForAbility(ability)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden border border-white/[0.04]">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-600 via-primary-400 to-accent-400 rounded-full shadow-glow-primary"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-[11px] text-gray-600 mt-1.5">
            {band.low === band.high
              ? `You look like a ${band.low} learner so far.`
              : `You sit between ${band.low} and ${band.high}.`}
          </p>
        </div>

        {item && (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16, rotateX: -8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1"
          >
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="inline-block px-2.5 py-1 rounded-md bg-white/[0.05] text-xs font-medium text-gray-400">
                {item.skill} · {item.level}
              </span>
              {item.kind !== 'mcq' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-500/10 text-[11px] font-medium text-primary-400">
                  {item.kind === 'listening' ? (
                    <>
                      <Volume2 className="w-3 h-3" /> Listening
                    </>
                  ) : item.kind === 'speaking' ? (
                    <>
                      <Mic className="w-3 h-3" /> Speaking
                    </>
                  ) : (
                    <>
                      <PenLine className="w-3 h-3" /> Writing
                    </>
                  )}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-6 leading-snug font-sans text-3d">
              {item.question}
            </h2>

            {/* Listening: play the sentence first */}
            {item.kind === 'listening' && (
              <div className="mb-6">
                {isSkippable ? (
                  <p className="text-xs text-gray-500 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3.5 py-3">
                    Your browser cannot play speech, so this item is skipped.
                  </p>
                ) : (
                  <button
                    onClick={() => playSentence(item.spoken ?? '')}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-primary-500/12 border border-primary-500/25 text-primary-300 text-sm font-semibold hover:bg-primary-500/20 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    {listening ? 'Playing…' : 'Play the sentence'}
                  </button>
                )}
              </div>
            )}

            {/* Speaking: record and compare */}
            {item.kind === 'speaking' && (
              <div className="mb-6 space-y-3">
                {isSkippable ? (
                  <p className="text-xs text-gray-500 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3.5 py-3">
                    Your browser does not support voice input, so this item is skipped.
                  </p>
                ) : (
                  <>
                    <div className="text-sm text-gray-200 glass-panel depth-1 rounded-xl p-4 leading-relaxed">
                      &ldquo;{item.target}&rdquo;
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={startRecording} disabled={recording}>
                        <Mic className="w-4 h-4" /> {recording ? 'Listening…' : 'Record your voice'}
                      </Button>
                      {speechScore && (
                        <span className="text-sm font-bold text-primary-300 tabular-nums">
                          {speechScore.score}%
                        </span>
                      )}
                    </div>
                    {transcript && (
                      <p className="text-xs text-gray-400 glass-panel rounded-xl p-3">
                        We heard: &ldquo;{transcript}&rdquo;
                      </p>
                    )}
                    {speechScore && (
                      <div className="glass-panel depth-1 rounded-xl p-3.5 space-y-2">
                        <p className="text-[11px] text-gray-400">
                          {speakingVerdict(speechScore.score).label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {speechScore.words.map((word, i) => (
                            <span
                              key={`${word.word}-${i}`}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                word.status === 'hit'
                                  ? 'bg-success-500/12 text-success-300 border border-success-500/20'
                                  : word.status === 'close'
                                    ? 'bg-warning-500/12 text-warning-300 border border-warning-500/20'
                                    : word.status === 'missed'
                                      ? 'bg-red-500/12 text-red-300 border border-red-500/20'
                                      : 'bg-white/[0.04] text-gray-500 border border-white/[0.06]'
                              }`}
                            >
                              {word.word}
                              {word.heard ? ` → ${word.heard}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Writing: type an answer */}
            {item.kind === 'writing' && (
              <div className="mb-6">
                <textarea
                  value={written}
                  onChange={(e) => setWritten(e.target.value)}
                  rows={4}
                  placeholder="Write your answer in English…"
                  className="w-full px-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40 transition-colors resize-none"
                />
                <p className="text-[11px] text-gray-600 mt-1.5">
                  At least {item.minWords ?? 5} words
                  {item.keyword ? `, and use the word "${item.keyword}"` : ''}.
                </p>
              </div>
            )}

            {voiceError && (
              <p className="text-xs text-warning-400 bg-warning-500/5 border border-warning-500/10 rounded-xl px-3.5 py-2.5 mb-4">
                {voiceError}
              </p>
            )}

            {(item.kind === 'mcq' || item.kind === 'listening') && (
              <div className="space-y-3">
                {item.options.map((option, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelected(i)}
                    className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 ${
                      selected === i
                        ? 'bg-primary-500/15 border-primary-500/50 text-white scale-[1.01] shadow-glow-primary'
                        : 'glass border-white/[0.06] text-gray-300 hover:border-white/[0.12] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{option}</span>
                      {selected === i && (
                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center animate-scale-in">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Next button */}
        {item && (
          <div className="pt-6">
            <Button
              onClick={handleNext}
              size="lg"
              fullWidth
              disabled={
                !isSkippable &&
                (item.kind === 'writing'
                  ? written.trim().length === 0
                  : item.kind === 'speaking'
                    ? transcript.trim().length === 0
                    : selected === null)
              }
            >
              {item.kind === 'writing' || item.kind === 'speaking' ? 'Submit' : 'Next'}
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Minimal shape of the Web Speech recognition API used here. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: {
    results: { length: number; [index: number]: { 0: { transcript: string } } };
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
