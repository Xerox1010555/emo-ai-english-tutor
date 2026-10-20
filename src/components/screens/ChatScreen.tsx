import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Send, Mic, Volume2, Trash2, Sparkles, Cpu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTutor } from '@/context/TutorContext';
import { supabase } from '@/lib/supabase';
import { askTutor, toTutorTurns } from '@/lib/ai/client';
import type { AiCorrection } from '@/lib/ai/types';
import type { ConversationMessage } from '@/lib/types';
import { TypingDots, SoundWave } from '@/components/ui/Animations';
import { EASE } from '@/components/ui/motionTokens';
import { AssistantModeSwitch } from '@/components/AssistantModeSwitch';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: { 0: { transcript: string }; isFinal: boolean };
  };
}
interface SpeechRecognitionInstance extends EventTarget {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

interface RenderMessage extends ConversationMessage {
  corrections?: AiCorrection[] | null;
  source?: 'llm' | 'offline-engine';
  targetSkill?: string;
  isPending?: boolean;
}

const fallbackNotice: Record<string, string> = {
  'not-configured': 'AI tutor is not connected yet — using the built-in rules engine.',
  network: 'No connection to the AI tutor — using the built-in rules engine.',
  timeout: 'The AI tutor timed out — using the built-in rules engine.',
  'rate-limit': 'The AI tutor is rate-limited right now — using the built-in rules engine.',
  unauthorized: 'AI tutor authorization failed — using the built-in rules engine.',
  server: 'The AI tutor service errored — using the built-in rules engine.',
  'invalid-response': 'The AI tutor sent an unusable reply — using the built-in rules engine.',
  'empty-response': 'The AI tutor returned nothing — using the built-in rules engine.',
  cancelled: 'Request cancelled.',
  unknown: 'Something went wrong — using the built-in rules engine.',
};

export function ChatScreen() {
  const { profile, user } = useAuth();
  const { mode, profileSnapshot, focus, refreshSnapshot } = useTutor();
  const [messages, setMessages] = useState<RenderMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const loadMessages = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conversation_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50);
    if (data && data.length > 0) {
      setMessages(data as RenderMessage[]);
    } else {
      setMessages([welcomeMessage(user.id)]);
    }
  }, [user]);

  useEffect(() => {
    void loadMessages();

    const SR = (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      }
    ).SpeechRecognition ||
      (window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      }).webkitSpeechRecognition;

    if (SR) {
      setVoiceSupported(true);
      const recognition = new SR();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };
      recognition.onerror = () => {
        setRecording(false);
        setError('Voice recognition failed. Try typing instead.');
      };
      recognition.onend = () => setRecording(false);
      recognitionRef.current = recognition;
    }

    if ('speechSynthesis' in window) setTtsSupported(true);
  }, [loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  // A new focus means the tutor should mention it without being asked.
  useEffect(() => {
    if (!focus) return;
    setBanner(`Now focused on: ${focus.title} (${focus.skill})`);
    const timer = window.setTimeout(() => setBanner(null), 8000);
    return () => window.clearTimeout(timer);
  }, [focus]);

  async function sendMessage(text: string) {
    if (!user || !text.trim() || busyRef.current) return;
    busyRef.current = true;
    setError(null);
    setBanner(null);
    setInput('');

    const userMsg: RenderMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      role: 'user',
      content: text,
      correction: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    await supabase.from('conversation_logs').insert({
      user_id: user.id,
      role: 'user',
      content: text,
    });

    setTyping(true);

    try {
      const historySnapshot = toTutorTurns(messages);
      const { reply } = await askTutor({
        message: text,
        history: historySnapshot,
        profile: profileSnapshot,
        mode,
        focus: focus ?? null,
      });

      const emoMsg: RenderMessage = {
        id: crypto.randomUUID(),
        user_id: user.id,
        role: 'emo',
        content: reply.reply,
        // The display string keeps the existing chat_log column populated.
        correction: reply.corrections[0]
          ? `"${reply.corrections[0].original}" → "${reply.corrections[0].corrected}". ${reply.corrections[0].explanation}`
          : null,
        corrections: reply.corrections,
        source: reply.source,
        targetSkill: reply.targetSkill,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, emoMsg]);
      setTyping(false);

      if (reply.source === 'offline-engine' && reply.fallbackReason) {
        setBanner(fallbackNotice[reply.fallbackReason] ?? fallbackNotice.unknown);
      }

      await supabase.from('conversation_logs').insert({
        user_id: user.id,
        role: 'emo',
        content: reply.reply,
        correction: emoMsg.correction,
      });

      // Feed the learning profile: mistakes the tutor flagged, and the skill
      // this exchange actually targeted.
      if (reply.corrections.length > 0) {
        await recordMistakes(user.id, reply.corrections);
        await refreshSnapshot();
      }
    } catch (err) {
      setTyping(false);
      console.error('[chat] tutor request failed:', err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not reach the tutor. Check your connection and try again.',
      );
    } finally {
      busyRef.current = false;
      inputRef.current?.focus();
    }
  }

  function speak(text: string) {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  }

  function toggleRecording() {
    if (!recognitionRef.current) {
      setError('Voice recognition is not supported in your browser.');
      return;
    }
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      setInput('');
      try {
        recognitionRef.current.start();
        setRecording(true);
      } catch {
        setError('Could not start voice recognition. Try again.');
      }
    }
  }

  async function clearChat() {
    if (!user) return;
    await supabase.from('conversation_logs').delete().eq('user_id', user.id);
    setMessages([welcomeMessage(user.id)]);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] sm:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 glass-strong border-b border-white/[0.06] z-10 safe-area-top">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="text-sm font-extrabold text-white">E</span>
            </div>
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success-500 border-2 border-ink-950"
              animate={{ opacity: typing ? [1, 0.3, 1] : 1 }}
              transition={{ duration: 1.2, repeat: typing ? Infinity : 0 }}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white">Emo</h1>
            <p className="text-[11px] text-gray-500 truncate">
              {profile?.current_level} · {modeLabel(mode)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <AssistantModeSwitch compact />
          <button
            onClick={clearChat}
            aria-label="Clear conversation"
            className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <Trash2 className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Context banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mx-4 mt-3 text-xs flex items-start gap-2 bg-accent-500/10 border border-accent-500/20 text-accent-400 rounded-xl px-3.5 py-2.5 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{banner}</span>
              <button onClick={() => setBanner(null)} className="text-accent-400/60 hover:text-accent-400">
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            ttsSupported={ttsSupported}
            onSpeak={speak}
          />
        ))}

        {typing && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
              <TypingDots />
            </div>
          </motion.div>
        )}
      </div>

      {error && (
        <div className="px-4 pb-2">
          <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-3 glass-strong border-t border-white/[0.06]">
        {recording && (
          <div className="flex items-center justify-center gap-3 mb-2 py-2">
            <SoundWave active={true} />
            <span className="text-xs text-primary-400 font-medium">Listening...</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {voiceSupported && (
            <button
              onClick={toggleRecording}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                recording
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-105'
                  : 'glass hover:bg-white/[0.08] text-gray-400'
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim() && !busyRef.current) void sendMessage(input);
            }}
            placeholder={recording ? 'Speak now...' : 'Type in English...'}
            disabled={recording || typing}
            className="flex-1 px-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || typing}
            aria-label="Send message"
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none shadow-lg shadow-primary-500/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  ttsSupported,
  onSpeak,
}: {
  message: RenderMessage;
  ttsSupported: boolean;
  onSpeak: (text: string) => void;
}) {
  const isUser = message.role === 'user';
  const corrections = message.corrections ?? [];
  const showCorrections = !isUser && corrections.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="text-[9px] font-bold text-white">E</span>
            </div>
            <span className="text-[11px] text-gray-600">Emo</span>
            {message.source === 'llm' && (
              <span
                className="flex items-center gap-0.5 text-[9px] text-gray-700"
                title="Live AI tutor"
              >
                <Cpu className="w-2.5 h-2.5" />
              </span>
            )}
            {message.targetSkill && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-600">
                {message.targetSkill}
              </span>
            )}
            {ttsSupported && (
              <button
                onClick={() => onSpeak(message.content)}
                aria-label="Play message"
                className="ml-1 p-1 rounded hover:bg-white/10 transition-colors"
              >
                <Volume2 className="w-3 h-3 text-gray-600" />
              </button>
            )}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser ? 'bg-primary-500 text-white rounded-br-md' : 'glass text-gray-200 rounded-bl-md'
          }`}
        >
          {message.content}
        </div>

        {showCorrections && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.06 }}
            className="mt-1.5 space-y-1.5"
          >
            {corrections.map((c, i) => (
              <div
                key={i}
                className="text-xs text-warning-400 bg-warning-500/5 border border-warning-500/10 rounded-lg px-3 py-2 max-w-full"
              >
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span className="line-through opacity-70">{c.original}</span>
                      <span className="mx-1.5 opacity-40">→</span>
                      <span className="text-warning-300">{c.corrected}</span>
                    </p>
                    <p className="text-warning-400/70 mt-0.5 leading-relaxed">{c.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function welcomeMessage(userId: string): RenderMessage {
  return {
    id: 'welcome',
    user_id: userId,
    role: 'emo',
    content:
      "I'm Emo. I know your level, your recent mistakes, and what you're working on — so I'll meet you there. Write to me in English, Arabic, or both. What do you want to work on?",
    correction: null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Upserts a flagged mistake so it can influence future prompts. Failures are
 * non-fatal: the chat already succeeded, and on an un-migrated database this
 * simply no-ops.
 */
async function recordMistakes(userId: string, corrections: AiCorrection[]): Promise<void> {
  for (const correction of corrections.slice(0, 2)) {
    const label = correction.original.trim().slice(0, 120);
    if (!label) continue;

    // Preferred: one atomic statement (migration 3) — no read-modify-write.
    const { error: rpcError } = await supabase.rpc('bump_recurring_mistake', {
      p_label: label,
      p_category: correction.category,
    });
    if (!rpcError) continue;

    // Fallback for an un-migrated database.
    const { data: existing } = await supabase
      .from('recurring_mistakes')
      .select('id, occurrences')
      .eq('user_id', userId)
      .ilike('label', label)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('recurring_mistakes')
        .update({ occurrences: existing.occurrences + 1, last_seen: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('recurring_mistakes').insert({
        user_id: userId,
        label,
        category: correction.category,
        occurrences: 1,
      });
    }
  }
}

function modeLabel(mode: string): string {
  if (mode === 'coach') return 'Coach mode';
  if (mode === 'strict') return 'Strict mode';
  return 'Friendly mode';
}
