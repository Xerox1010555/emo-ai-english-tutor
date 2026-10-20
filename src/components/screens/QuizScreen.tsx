import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getQuizSet, type QuizQuestion } from '@/lib/quizData';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Check, X, Trophy, RotateCcw, ChevronRight, Brain, Home } from 'lucide-react';
import type { CEFRLevel } from '@/lib/types';
import type { TabId } from '@/components/Layout';

export function QuizScreen({ onNavigate }: { onNavigate?: (tab: TabId) => void }) {
  const { profile, user } = useAuth();
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [pastResults, setPastResults] = useState<{ score: number; total: number; taken_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadPastResults = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('quiz_results')
      .select('score, total, taken_at')
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false })
      .limit(5);
    if (data) setPastResults(data as { score: number; total: number; taken_at: string }[]);
  }, [user]);

  useEffect(() => {
    loadPastResults().finally(() => setLoading(false));
  }, [loadPastResults]);

  function startQuiz() {
    const level = (profile as { current_level: CEFRLevel } | null)?.current_level;
    const set = getQuizSet(5, level);
    setQuiz(set);
    setCurrentIndex(0);
    setSelected(null);
    setShowAnswer(false);
    setScore(0);
    setFinished(false);
    setSaveError(null);
  }

  function handleAnswer(idx: number) {
    if (showAnswer) return;
    const question = quiz?.[currentIndex];
    if (!question) return;
    setSelected(idx);
    setShowAnswer(true);
    if (idx === question.correct) {
      setScore((s) => s + 1);
    }
  }

  async function handleNext() {
    if (!quiz) return;
    if (currentIndex + 1 < quiz.length) {
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
      setShowAnswer(false);
    } else {
      // Save results
      setFinished(true);
      if (user) {
        const { error } = await supabase.from('quiz_results').insert({
          user_id: user.id,
          quiz_type: 'mixed',
          score,
          total: quiz.length,
        });
        if (error) {
          setSaveError('Your result could not be saved. It will not appear in your history.');
        }
        loadPastResults();
      }
    }
  }

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-4">
        <div className="h-32 shimmer-bg animate-shimmer rounded-2xl" />
        <div className="h-20 shimmer-bg animate-shimmer rounded-2xl" />
      </div>
    );
  }

  // Start screen
  if (!quiz) {
    return (
      <div className="px-5 py-6 space-y-6">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-white font-sans">Quizzes</h1>
          <p className="text-sm text-gray-500 mt-1">Test your knowledge and track improvement</p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <Card className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto">
              <Brain className="w-8 h-8 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ready for a challenge?</h2>
              <p className="text-sm text-gray-500 mt-1">5 questions · multiple choice & fill-in-the-blank</p>
            </div>
            <Button size="lg" onClick={startQuiz}>
              Start Quiz <ChevronRight className="w-4 h-4" />
            </Button>
          </Card>
        </div>

        {pastResults.length > 0 && (
          <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Results</h2>
            <div className="space-y-2">
              {pastResults.map((r, i) => {
                const pct = Math.round((r.score / r.total) * 100);
                return (
                  <Card key={i} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {r.score} / {r.total} correct
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${pct >= 80 ? 'text-success-400' : pct >= 50 ? 'text-warning-400' : 'text-primary-400'}`}>
                      {pct}%
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Results screen
  if (finished && quiz) {
    const pct = Math.round((score / quiz.length) * 100);
    return (
      <div className="px-5 py-6 space-y-6">
        <div className="animate-fade-up flex flex-col items-center text-center py-8">
          <div className="w-20 h-20 rounded-3xl bg-primary-500/10 flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-primary-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white font-sans">{pct}%</h1>
          <p className="text-sm text-gray-500 mt-2">
            You scored {score} out of {quiz.length}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {pct >= 80 ? 'Excellent work. Keep this level.' : pct >= 50 ? 'Good. There\'s room to sharpen.' : 'Noted. We\'ll focus on these areas.'}
          </p>
        </div>

        {saveError && (
          <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-xl px-3.5 py-2.5">
            {saveError}
          </div>
        )}

        <Button fullWidth size="lg" onClick={startQuiz}>
          <RotateCcw className="w-4 h-4" /> Try Again
        </Button>
        <Button fullWidth size="md" variant="ghost" onClick={() => setQuiz(null)}>
          Back to Quizzes
        </Button>
        {onNavigate && (
          <Button fullWidth size="md" variant="ghost" onClick={() => onNavigate('home')}>
            <Home className="w-4 h-4" /> Back to Home
          </Button>
        )}
      </div>
    );
  }

  // Quiz in progress
  const q = quiz?.[currentIndex];
  const progress = quiz ? ((currentIndex + 1) / quiz.length) * 100 : 0;

  if (!q) {
    return (
      <div className="px-5 py-6 space-y-6">
        <Card className="text-center py-10 space-y-3">
          <p className="text-sm text-gray-400">No questions are available for your level yet.</p>
          <Button size="sm" variant="secondary" onClick={() => setQuiz(null)}>
            Back to Quizzes
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-6 min-h-screen flex flex-col">
      {/* Progress */}
      <div className="animate-fade-up">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">Question {currentIndex + 1} of {quiz.length}</span>
          <span className="text-xs font-medium text-primary-400">Score: {score}</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div key={currentIndex} className="flex-1 animate-fade-up">
        <div className="mb-3">
          <span className="inline-block px-2.5 py-1 rounded-md bg-white/[0.05] text-xs font-medium text-gray-400">
            {q.type === 'fill_blank' ? 'Fill in the blank' : 'Multiple choice'} · {q.level}
          </span>
        </div>
        <h2 className="text-xl font-bold text-white mb-6 leading-snug font-sans">
          {q.question}
        </h2>

        <div className="space-y-3">
          {q.options.map((option, i) => {
            const isCorrect = i === q.correct;
            const isSelected = selected === i;
            let cls = 'glass border-white/[0.06] text-gray-300';
            if (showAnswer) {
              if (isCorrect) cls = 'bg-success-500/15 border-success-500/50 text-white';
              else if (isSelected) cls = 'bg-red-500/15 border-red-500/50 text-white';
              else cls = 'glass border-white/[0.04] text-gray-600';
            } else if (isSelected) {
              cls = 'bg-primary-500/15 border-primary-500/50 text-white';
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={showAnswer}
                className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 ${cls} ${!showAnswer ? 'hover:border-white/[0.12] hover:bg-white/[0.05]' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{option}</span>
                  {showAnswer && isCorrect && <Check className="w-5 h-5 text-success-400" strokeWidth={2.5} />}
                  {showAnswer && isSelected && !isCorrect && <X className="w-5 h-5 text-red-400" strokeWidth={2.5} />}
                </div>
              </button>
            );
          })}
        </div>

        {showAnswer && (
          <div className="mt-5 animate-fade-up">
            <Card className="bg-white/[0.02]">
              <p className="text-sm text-gray-300 leading-relaxed">{q.explanation}</p>
            </Card>
          </div>
        )}
      </div>

      {/* Next button */}
      {showAnswer && (
        <div className="animate-fade-up">
          <Button fullWidth size="lg" onClick={handleNext}>
            {currentIndex + 1 < quiz.length ? 'Next Question' : 'See Results'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
