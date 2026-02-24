'use client';

import { useLoginForm } from '@/features/auth/hooks/use-login-form';

export function LoginForm() {
  const {
    companyName,
    email,
    password,
    error,
    submitting,
    setCompanyName,
    setEmail,
    setPassword,
    submit,
  } = useLoginForm();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 border rounded-xl p-6"
      >
        <h1 className="text-xl font-semibold">Login</h1>

        <div className="space-y-1">
          <label className="text-sm">Company</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
