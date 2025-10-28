import React, { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLogo from '../components/AppLogo';

type AuthMode = 'login' | 'signup';

const Auth: React.FC = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (mode === 'login' ? 'Login to ComplianceAI' : 'Create Your ComplianceAI Account'), [mode]);
  const submitLabel = useMemo(() => (mode === 'login' ? 'Login' : 'Sign Up'), [mode]);

  const reset = useCallback(() => {
    setPassword('');
    if (mode === 'signup') {
      setName('');
    }
  }, [mode]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        if (mode === 'login') {
          await login({ email, password });
        } else {
          await signup({ name, email, password });
        }
        reset();
      } catch (err: any) {
        setError(err?.message ?? 'Unable to authenticate. Try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [email, login, mode, password, reset, signup, name],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900/80 p-8 shadow-xl shadow-black/40">
        <div className="mb-6 text-center">
          <div className="flex justify-center">
            <AppLogo orientation="vertical" className="items-center" textClassName="items-center text-center" />
          </div>
          <h1 className="text-xl font-semibold text-gray-100">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === 'login'
              ? 'Access compliance reviews and collaboration tools.'
              : 'Set up an account to share reviews inside your organization.'}
          </p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="space-y-1">
              <label htmlFor="auth-name" className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="Jordan Blake"
                disabled={submitting}
                required
              />
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="auth-email" className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="you@company.com"
              autoComplete="email"
              disabled={submitting}
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="auth-password" className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={submitting}
              required
            />
            {mode === 'signup' && (
              <p className="text-[11px] text-gray-500">Use at least 8 characters with numbers or symbols.</p>
            )}
          </div>
          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Please wait…' : submitLabel}
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-gray-500">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className="font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Need an account? Sign up.
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Have an account? Log in.
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
