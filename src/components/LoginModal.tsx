import { useState } from 'react';
import { Crosshair, Mail, Lock, Loader2, AlertCircle, ArrowRight, UserPlus, LogIn } from 'lucide-react';

interface LoginModalProps {
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: string | null }>;
}

export default function LoginModal({ onSignIn, onSignUp }: LoginModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = mode === 'signin'
      ? await onSignIn(email.trim(), password)
      : await onSignUp(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-600/8 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/30">
            <Crosshair className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              X-Hunter <span className="text-brand-400">AI</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">B2B Lead Hunting & Sales Automation</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl">
          {/* Tab toggle */}
          <div className="mb-6 flex gap-1 rounded-lg bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'signin' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400 animate-fade-in">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Helper text */}
          <p className="mt-4 text-center text-xs text-slate-500">
            {mode === 'signin'
              ? 'New here? Switch to Sign Up to create an account.'
              : 'Already have an account? Switch to Sign In.'}
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          Your data is stored securely and synced across devices.
        </p>
      </div>
    </div>
  );
}
