import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { MeshBackground } from '@/components/ui/MeshBackground';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();
  const { setTheme, isLight } = useTheme();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'forgot') {
      setLoading(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      setLoading(false);
      if (resetError) {
        setError(resetError.message);
      } else {
        setNotice('Check your inbox — we sent you a link to set a new password.');
        setMode('signin');
      }
      return;
    }

    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const result = await fn(email, password);
    setLoading(false);
    if (result.error) {
      setError(friendlyError(result.error));
      return;
    }
    if ('needsConfirmation' in result && result.needsConfirmation) {
      setNotice('Account created. Check your inbox to confirm your email, then sign in.');
      setMode('signin');
    }
  }

  const benefits = [
    'A tutor that remembers your mistakes',
    'One lesson a day, written for your level',
    'Speaking practice scored word by word',
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <MeshBackground />

      {/* Theme switch, always reachable */}
      <button
        onClick={() => setTheme(isLight ? 'dark' : 'light')}
        aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-xl glass-panel depth-1 flex items-center justify-center text-gray-400 hover:text-primary-300 transition-colors"
      >
        {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>

      <div className="relative flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative mb-5">
            <motion.div
              className="w-24 h-24 rounded-[28px] glass-panel depth-3 flex items-center justify-center"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 flex items-center justify-center shadow-glow-primary">
                <span className="text-3xl font-extrabold text-white font-sans">E</span>
              </div>
            </motion.div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500/30 animate-pulse-ring" />
          </div>

          <h1 className="text-4xl font-extrabold text-white font-sans tracking-tight text-gradient-brand text-3d">
            Emo
          </h1>
          <p className="text-gray-400 text-sm mt-2 text-center leading-relaxed max-w-xs">
            {t('auth.tagline')}
          </p>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel rounded-3xl p-6 shadow-glass-lg"
        >
          {mode !== 'forgot' && (
            <div className="flex gap-2 mb-6 p-1 bg-black/25 rounded-xl border border-white/[0.05]">
              <button
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'signin'
                    ? 'bg-gradient-to-b from-white/[0.14] to-white/[0.05] text-white border border-white/[0.08]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t('auth.signin')}
              </button>
              <button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-gradient-to-b from-white/[0.14] to-white/[0.05] text-white border border-white/[0.08]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t('auth.signup')}
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-5">
              <h2 className="text-base font-bold text-white">{t('auth.reset')}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Enter your email and we will send you a reset link.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-[var(--input-bg)] border border-white/[0.07] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-[var(--input-bg)] border border-white/[0.07] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                  />
                </div>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setNotice(null);
                    }}
                    className="text-[11px] text-gray-500 hover:text-primary-400 transition-colors mt-1.5 inline-flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" /> {t('auth.forgot')}
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            {notice && (
              <div className="text-sm text-success-300 bg-success-500/8 border border-success-500/20 rounded-lg px-4 py-2.5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'signin'
                  ? t('auth.signin')
                  : mode === 'signup'
                    ? t('auth.create')
                    : t('auth.resetSend')}
              {!loading && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
            </Button>
          </form>
        </motion.div>

        {/* What the app does — the promise, not a slogan */}
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 space-y-2"
        >
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-[11px] text-gray-500 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-primary-400/70 mt-0.5 flex-shrink-0" />
              <span>{benefit}</span>
            </li>
          ))}
        </motion.ul>
      </div>
    </div>
  );
}

/** Turns raw Supabase messages into something a learner can act on. */
function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) {
    return 'That email and password do not match an account.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email is not confirmed yet. Check your inbox for the confirmation link.';
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'That email already has an account. Try signing in instead.';
  }
  if (lower.includes('password should be')) {
    return 'Passwords need at least 6 characters.';
  }
  if (lower.includes('weak') || lower.includes('guessable')) {
    return 'That password is too easy to guess. Use three unrelated words.';
  }
  if (lower.includes('fetch') || lower.includes('network')) {
    return 'No connection. Check your internet and try again.';
  }
  return message;
}
