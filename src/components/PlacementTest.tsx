import { useState } from 'react';
import { placementQuestions, type PlacementQuestion } from '@/lib/placementData';
import type { CEFRLevel, Skill } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Check, GraduationCap, ChevronRight } from 'lucide-react';

interface PlacementTestProps {
  onComplete: (results: { level: CEFRLevel; skillScores: Record<Skill, number> }) => void;
}

const levelOrder: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function PlacementTest({ onComplete }: PlacementTestProps) {
  const questions: PlacementQuestion[] = placementQuestions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  function handleAnswer(optionIndex: number) {
    setSelected(optionIndex);
  }

  function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Calculate results
      const skillScores: Record<Skill, number> = {
        Grammar: 0, Vocabulary: 0, Listening: 0, Speaking: 0, Writing: 0, Reading: 0,
      };
      const skillCounts: Record<string, number> = {};

      newAnswers.forEach((ans, i) => {
        const q = questions[i];
        const isCorrect = ans === q.correct;
        if (isCorrect) {
          skillScores[q.skill] = (skillScores[q.skill] || 0) + 1;
        }
        skillCounts[q.skill] = (skillCounts[q.skill] || 0) + 1;
      });

      // Determine CEFR level: find the highest level where user got >= 50% correct
      const levelPerformance: Record<CEFRLevel, { correct: number; total: number }> = {
        A1: { correct: 0, total: 0 }, A2: { correct: 0, total: 0 },
        B1: { correct: 0, total: 0 }, B2: { correct: 0, total: 0 },
        C1: { correct: 0, total: 0 }, C2: { correct: 0, total: 0 },
      };

      newAnswers.forEach((ans, i) => {
        const q = questions[i];
        levelPerformance[q.level].total++;
        if (ans === q.correct) levelPerformance[q.level].correct++;
      });

      let determinedLevel: CEFRLevel = 'A1';
      for (const level of levelOrder) {
        const perf = levelPerformance[level];
        if (perf.total > 0 && perf.correct / perf.total >= 0.5) {
          determinedLevel = level;
        }
      }

      // Convert skill scores to percentages
      const finalSkillScores = {} as Record<Skill, number>;
      for (const skill of Object.keys(skillScores) as Skill[]) {
        const count = skillCounts[skill] || 1;
        finalSkillScores[skill] = Math.round((skillScores[skill] / count) * 100);
      }

      onComplete({ level: determinedLevel, skillScores: finalSkillScores });
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 animate-fade-down">
          <div className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Placement Test</h1>
            <p className="text-xs text-gray-500">Question {currentIndex + 1} of {questions.length}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
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
              {currentQuestion.skill} · {currentQuestion.level}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-8 leading-snug font-sans">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 ${
                  selected === i
                    ? 'bg-primary-500/15 border-primary-500/50 text-white scale-[1.01]'
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
              </button>
            ))}
          </div>
        </div>

        {/* Next button */}
        <div className="pt-6">
          <Button
            onClick={handleNext}
            size="lg"
            fullWidth
            disabled={selected === null}
          >
            {currentIndex + 1 < questions.length ? 'Next' : 'See Results'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
