'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [companyName, setCompanyName] = useState('WarehouseHub');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    try {
      const res = await api.post('/auth/login', {
        companyName,
        email,
        password,
      });
      // access/refresh token은 api.ts에서 Cookies로 저장하는 구조가 아니라서 여기서 저장 필요
      // (간단히 페이지에서 저장)
      const Cookies = (await import('js-cookie')).default;
      Cookies.set('accessToken', res.data.accessToken);
      Cookies.set('refreshToken', res.data.refreshToken);

      window.location.href = '/app';
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Login failed');
    }
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
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button className="w-full bg-black text-white rounded px-3 py-2">
          Sign in
        </button>
      </form>
    </div>
  );
}
