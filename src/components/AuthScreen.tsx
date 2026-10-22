import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Sparkles,
  Sun,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';

/**
 * The sign-in / sign-up screen.
 *
 * The layout follows the standalone Arabic design that shipped with the
 * project (animated orbs, a 3D card with a moving sheen, a password strength
 * meter) but it runs on the REAL Supabase auth, inside the app shell, with
 * the theme and the interface language working.
 */
export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();
  const { setTheme, isLight } = useTheme();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = passwordStrength(password);

  function reset() {
    setError(null);
    setNotice(null);
  }

  function switchMode(next: 'signin' | 'signup' | 'forgot') {
    setMode(next);
    reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();

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

    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError(t('auth.nameError'));
        return;
      }
      if (confirm !== password) {
        setError(t('auth.confirmError'));
        return;
      }
      if (!terms) {
        setError(t('auth.termsError'));
        return;
      }
    }

    setLoading(true);
    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, name.trim());
    setLoading(false);

    if (result.error) {
      setError(friendlyError(result.error));
      return;
    }
    if ('needsConfirmation' in result && result.needsConfirmation) {
      setNotice(t('auth.confirmNotice'));
      setMode('signin');
      return;
    }
    if (mode === 'signup') {
      setDone(true);
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" dir={isArabic() ? 'rtl' : 'ltr'}>
      <AuthBackdrop />

      <button
        onClick={() => setTheme(isLight ? 'dark' : 'light')}
        aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-xl glass-panel depth-1 flex items-center justify-center text-gray-400 hover:text-primary-300 transition-colors"
      >
        {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>

      <div className="relative flex-1 flex items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 26, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="scene w-full max-w-md"
        >
          <section className="glass-panel rounded-[22px] p-6 sm:p-8 shadow-glass-lg relative overflow-hidden group">
            {/* The moving sheen, straight from the standalone design. */}
            <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <span className="absolute -top-1/2 -left-1/3 h-[200%] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine" />
            </span>

            {done ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-success-500/15 border border-success-500/25 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-success-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t('auth.createdTitle')}</h2>
                  <p className="text-sm text-gray-400 mt-1">{t('auth.createdBody')}</p>
                </div>
                <Button fullWidth onClick={() => window.location.reload()}>
                  {t('auth.goToApp')}
                </Button>
              </motion.div>
            ) : (
              <>
                <header className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center mx-auto mb-3 shadow-glow-primary">
                    <span className="text-2xl font-extrabold text-white font-sans">E</span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-white font-sans tracking-tight">
                    {mode === 'signup'
                      ? t('auth.createAccount')
                      : mode === 'forgot'
                        ? t('auth.resetTitle')
                        : t('auth.welcomeBack')}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1.5">
                    {mode === 'signup'
                      ? t('auth.createSubtitle')
                      : mode === 'forgot'
                        ? t('auth.resetSubtitle')
                        : t('auth.signInSubtitle')}
                  </p>
                </header>

                {mode !== 'forgot' && (
                  <div className="flex gap-2 mb-6 p-1 bg-black/25 rounded-xl border border-white/[0.05]">
                    {(
                      [
                        { id: 'signin', label: t('auth.signIn') },
                        { id: 'signup', label: t('auth.signUp') },
                      ] as const
                    ).map((option) => {
                      const active = mode === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => switchMode(option.id)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                            active
                              ? 'bg-gradient-to-b from-white/[0.14] to-white/[0.05] text-white border border-white/[0.08]'
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <Field label={t('auth.name')} icon={<User className="w-4 h-4" />} delay={0}>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('auth.namePlaceholder')}
                        autoComplete="name"
                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                      />
                    </Field>
                  )}

                  <Field label={t('auth.email')} icon={<Mail className="w-4 h-4" />} delay={1}>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                    />
                  </Field>

                  {mode !== 'forgot' && (
                    <Field label={t('auth.password')} icon={<Lock className="w-4 h-4" />} delay={2}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </Field>
                  )}

                  {mode === 'signup' && password.length > 0 && (
                    <div className="flex items-center gap-2.5 -mt-1">
                      <div className="flex gap-1 flex-1">
                        {[0, 1, 2].map((bar) => (
                          <span
                            key={bar}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              bar < strength.level
                                ? strength.level === 1
                                  ? 'bg-red-400'
                                  : strength.level === 2
                                    ? 'bg-warning-400'
                                    : 'bg-success-400'
                                : 'bg-white/[0.08]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500">{strength.label}</span>
                    </div>
                  )}

                  {mode === 'signup' && (
                    <Field label={t('auth.confirmPassword')} icon={<Check className="w-4 h-4" />} delay={3}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
                      />
                    </Field>
                  )}

                  {mode === 'signup' && (
                    <label className="flex items-center gap-2.5 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={terms}
                        onChange={(e) => setTerms(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary-500"
                      />
                      {t('auth.terms')}
                    </label>
                  )}

                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] text-gray-500 hover:text-primary-400 transition-colors inline-flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" /> {t('auth.forgot')}
                    </button>
                  )}

                  {error && (
                    <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-2.5">
                      {error}
                    </div>
                  )}

                  {notice && (
                    <div className="text-sm text-success-300 bg-success-500/10 border border-success-500/25 rounded-lg px-4 py-2.5 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{notice}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    loading={loading}
                    className="relative overflow-hidden"
                  >
                    {mode === 'signup'
                      ? t('auth.createAccount')
                      : mode === 'forgot'
                        ? t('auth.sendReset')
                        : t('auth.signIn')}
                    {!loading && (
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    )}
                  </Button>
                </form>

                <footer className="mt-6 pt-5 border-t border-white/[0.06] text-center">
                  <p className="text-xs text-gray-500">
                    {mode === 'signup' ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
                    <button
                      onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
                      className="text-primary-400 hover:text-primary-300 transition-colors font-semibold"
                    >
                      {mode === 'signup' ? t('auth.signIn') : t('auth.signUp')}
                    </button>
                  </p>
                </footer>
              </>
            )}
          </section>
        </motion.div>
      </div>

      <div className="relative pb-8 flex items-center justify-center gap-2 text-[11px] text-gray-600">
        <Sparkles className="w-3.5 h-3.5" />
        <span>{t('auth.footer')}</span>
      </div>
    </div>
  );
}

/** A labelled input with an icon, matching the standalone design. */
function Field({
  label,
  icon,
  delay,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * delay, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-1.5"
    >
      <label className="block text-xs font-semibold text-gray-400">{label}</label>
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--input-bg)] border border-white/[0.07] focus-within:border-primary-500/45 transition-colors">
        <span className="text-gray-500 flex-shrink-0">{icon}</span>
        {children}
      </div>
    </motion.div>
  );
}

/**
 * The animated background: drifting orbs, a faint grid and slow particles —
 * the same ingredients as the standalone page, rebuilt in Tailwind.
 */
function AuthBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-primary-500/25 blur-[70px] animate-float" />
      <div className="absolute top-1/3 -right-32 w-[24rem] h-[24rem] rounded-full bg-accent-500/20 blur-[70px] animate-float [animation-delay:2s]" />
      <div className="absolute -bottom-32 left-1/4 w-[22rem] h-[22rem] rounded-full bg-purple-500/15 blur-[70px] animate-float [animation-delay:4s]" />
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%)',
        }}
      />
      {[
        'top-[18%] left-[16%]',
        'top-[62%] left-[8%]',
        'top-[32%] right-[12%]',
        'top-[78%] right-[22%]',
        'top-[12%] left-[52%]',
        'top-[52%] left-[38%]',
      ].map((position, index) => (
        <span
          key={position}
          className={`absolute ${position} w-1 h-1 rounded-full bg-white/40 animate-float`}
          style={{ animationDelay: `${index * 0.9}s`, animationDuration: '7s' }}
        />
      ))}
    </div>
  );
}

/** Password strength, from the shape of the password itself. */
function passwordStrength(password: string): { level: number; label: string } {
  if (password.length === 0) return { level: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  const level = Math.max(1, Math.min(3, score));
  const label = level === 1 ? 'Weak' : level === 2 ? 'Fair' : 'Strong';
  return { level, label };
}

/** True when the interface language is Arabic (so the layout mirrors). */
function isArabic(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.lang === 'ar';
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
