import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Check,
  Coffee,
  MessageCircle,
  Plane,
  Send,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Volume2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTutor } from '@/context/TutorContext';
import { askTutor } from '@/lib/ai/client';
import { emptyProfileSnapshot } from '@/lib/ai/types';
import {
  localCharacterReply,
  scenariosForLevel,
  scoreScenario,
  type Scenario,
} from '@/lib/learning/scenarios';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader, Pill, SectionHeader } from '@/components/ui/primitives';
import { EASE } from '@/components/ui/motionTokens';

const scenarioIcons = {
  briefcase: Briefcase,
  utensils: Coffee,
  plane: Plane,
  stethoscope: Stethoscope,
  chat: MessageCircle,
  shop: ShoppingBag,
};

interface Turn {
  role: 'character' | 'learner';
  text: string;
}

export function ScenarioScreen() {
  const { profile } = useAuth();
  const { profileSnapshot } = useTutor();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const available = useMemo(
    () => scenariosForLevel(profile?.current_level ?? 'B1'),
    [profile?.current_level],
  );

  const learnerText = useMemo(
    () => turns.filter((t) => t.role === 'learner').map((t) => t.text).join(' '),
    [turns],
  );

  const start = (next: Scenario) => {
    setScenario(next);
    setTurns([{ role: 'character', text: next.opening }]);
    setFinished(false);
    setError(null);
    setInput('');
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !scenario || thinking) return;

    setInput('');
    setError(null);
    const nextTurns: Turn[] = [...turns, { role: 'learner', text }];
    setTurns(nextTurns);
    setThinking(true);

    try {
      const { reply } = await askTutor(
        {
          message: text,
          history: nextTurns
            .filter((t) => t.role === 'learner')
            .slice(-6)
            .map((t) => ({ role: 'user' as const, content: t.text })),
          profile: profileSnapshot ?? emptyProfileSnapshot(),
          mode: 'friendly',
          focus: { skill: 'Speaking', title: scenario.title },
        },
        { skipCache: true, systemPrompt: scenario.systemPrompt },
      );

      setLive(reply.source === 'llm');
      setTurns((prev) => [
        ...prev,
        {
          role: 'character',
          text:
            reply.source === 'llm'
              ? reply.reply
              : localCharacterReply(nextTurns.filter((t) => t.role === 'learner').length - 1),
        },
      ]);
    } catch {
      setError('The character could not answer. Check your connection and try again.');
    } finally {
      setThinking(false);
    }
  }, [input, scenario, turns, thinking, profileSnapshot]);

  const score = useMemo(
    () => (scenario ? scoreScenario(scenario, learnerText) : null),
    [scenario, learnerText],
  );

  if (!scenario) {
    return (
      <div className="px-5 py-6 space-y-6">
        <PageHeader
          title="Roleplay"
          subtitle="Practise a real conversation — the AI plays the other side"
        />

        <div className="space-y-3">
          {available.map((item) => {
            const Icon = scenarioIcons[item.icon];
            return (
              <Card
                key={item.id}
                hairline
                depth={2}
                tilt
                onClick={() => start(item)}
                className="space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/25 to-primary-500/5 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      <Pill tone="neutral">{item.level}</Pill>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                      {item.setup}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="space-y-2">
          <SectionHeader title="How it works" />
          <ul className="space-y-1.5 text-[11px] text-gray-500 leading-relaxed">
            <li>• The character opens the conversation — you keep it going.</li>
            <li>• Say what you would really say; mistakes are fine here.</li>
            <li>• When you finish, you get a score, the phrases you covered and the ones you missed.</li>
          </ul>
        </Card>
      </div>
    );
  }

  if (finished && score) {
    return (
      <div className="px-5 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <Card hairline depth={3} tilt className="relative overflow-hidden space-y-3 text-center">
            <div className="aurora opacity-80" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center mx-auto shadow-glow-primary">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold text-white font-sans text-3d mt-3">
                {score.percentage}%
              </h2>
              <p className="text-xs text-gray-400">
                You spoke {score.words} words and covered {score.covered.length} of{' '}
                {scenario.keyPhrases.length} key phrases.
              </p>
            </div>
          </Card>
        </motion.div>

        {score.covered.length > 0 && (
          <div>
            <SectionHeader title="You used" />
            <Card className="space-y-1.5">
              {score.covered.map((phrase) => (
                <p key={phrase} className="text-xs text-success-300 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" /> {phrase}
                </p>
              ))}
            </Card>
          </div>
        )}

        {score.missing.length > 0 && (
          <div>
            <SectionHeader title="Try these next time" />
            <Card className="space-y-1.5">
              {score.missing.map((phrase) => (
                <p key={phrase} className="text-xs text-gray-400">
                  • {phrase}
                </p>
              ))}
            </Card>
          </div>
        )}

        <div>
          <SectionHeader title="Common pitfalls here" />
          <Card className="space-y-1.5">
            {scenario.pitfalls.map((pitfall) => (
              <p key={pitfall} className="text-xs text-warning-300/90">
                • {pitfall}
              </p>
            ))}
          </Card>
        </div>

        <div className="flex gap-2">
          <Button fullWidth variant="secondary" onClick={() => setScenario(null)}>
            Other scenarios
          </Button>
          <Button fullWidth onClick={() => start(scenario)}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500">You are talking to {scenario.role}</p>
          <h2 className="text-lg font-bold text-white font-sans">{scenario.title}</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setScenario(null)}>
          Leave
        </Button>
      </div>

      <Card className="space-y-2">
        <Pill tone="primary">Objective</Pill>
        <ul className="space-y-1">
          {scenario.objectives.map((objective) => (
            <li key={objective} className="text-[11px] text-gray-400 leading-relaxed">
              • {objective}
            </li>
          ))}
        </ul>
      </Card>

      {/* Conversation */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {turns.map((turn, index) => (
            <motion.div
              key={`${turn.role}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: EASE }}
              className={`flex ${turn.role === 'learner' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-glass ${
                  turn.role === 'learner'
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-md border border-primary-300/20'
                    : 'glass-panel text-gray-100 rounded-bl-md'
                }`}
              >
                {turn.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {thinking && (
          <div className="flex justify-start">
            <div className="glass-panel rounded-2xl rounded-bl-md px-4 py-3 text-xs text-gray-500">
              {scenario.role} is thinking…
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send();
          }}
          placeholder="Reply in English…"
          className="flex-1 px-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40 transition-colors"
        />
        <Button onClick={() => void send()} disabled={!input.trim() || thinking} aria-label="Send">
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-600">
          {live ? 'The character is live (a real model is answering).' : 'Running on the offline character script.'}
        </p>
        <Button size="sm" variant="secondary" onClick={() => setFinished(true)}>
          Finish
        </Button>
      </div>

      <Card className="space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-gray-500" />
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Phrases that sound natural
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {scenario.keyPhrases.map((phrase) => (
            <span
              key={phrase}
              className="px-2 py-0.5 rounded-md text-[11px] bg-white/[0.05] border border-white/[0.07] text-gray-400"
            >
              {phrase}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
