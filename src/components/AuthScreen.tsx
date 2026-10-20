import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12 animate-fade-up">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-3xl glass-strong flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <span className="text-2xl font-extrabold text-white font-sans">E</span>
              </div>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500/20 animate-pulse-ring" />
          </div>
          <h1 className="text-3xl font-extrabold text-white font-sans tracking-tight">Emo</h1>
          <p className="text-gray-400 text-sm mt-1.5 text-center">
            Your personal AI English learning assistant
          </p>
        </div>

        {/* Auth form */}
        <div className="glass rounded-3xl p-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex gap-2 mb-6 p-1 bg-black/30 rounded-xl">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'signin' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'signup' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Email</label>
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

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Password</label>
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
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </div>

        <div className="flex items-center gap-3 mt-8 text-xs text-gray-600 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Adaptive lessons, daily practice, progress tracking, and a conversational tutor.</span>
        </div>
      </div>
    </div>
  );
}
