import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { Mail, Lock, ArrowRight, Sparkles, CheckCircle2, KeyRound } from 'lucide-react';

type Mode = 'signin' | 'signup' | 'forgot';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('signin');
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

  return (
    <div className="min-h-screen flex flex-col">
      <MeshBackground />

      <div className="relative flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 animate-fade-up">
          <div className="relative mb-5">
            <motion.div
              className="w-24 h-24 rounded-[28px] glass-panel flex items-center justify-center shadow-glass-lg"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 flex items-center justify-center shadow-glow-primary">
                <span className="text-3xl font-extrabold text-white font-sans">E</span>
              </div>
            </motion.div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500/30 animate-pulse-ring" />
          </div>
          <h1 className="text-4xl font-extrabold text-white font-sans tracking-tight text-gradient-brand">
            Emo
          </h1>
          <p className="text-gray-400 text-sm mt-2 text-center leading-relaxed">
            {t('auth.tagline')}
          </p>
        </div>

        {/* Auth form */}
        <div className="glass-panel rounded-3xl p-6 animate-fade-up shadow-glass-lg" style={{ animationDelay: '0.1s' }}>
          {mode !== 'forgot' && (
            <div className="flex gap-2 mb-6 p-1 bg-black/30 rounded-xl">
              <button
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'signin' ? 'bg-white/10 text-white' : 'text-gray-500'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'signup' ? 'bg-white/10 text-white' : 'text-gray-500'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-5">
              <h2 className="text-base font-bold text-white">Reset your password</h2>
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
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/50 transition-colors"
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
                    className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/50 transition-colors"
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
                    <KeyRound className="w-3 h-3" /> Forgot password?
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
              <div className="text-sm text-success-400 bg-success-500/5 border border-success-500/15 rounded-lg px-4 py-2.5 flex items-start gap-2">
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
        </div>

        <div className="flex items-center gap-3 mt-8 text-xs text-gray-600 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{t('auth.footer')}</span>
        </div>
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
  if (lower.includes('fetch') || lower.includes('network')) {
    return 'No connection. Check your internet and try again.';
  }
  return message;
}
