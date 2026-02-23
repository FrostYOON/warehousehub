'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export default function AppHome() {
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Unauthorized (${res.status})`);
        }

        const data = await res.json();
        if (!alive) return;
        setMe(data);
      } catch {
        if (!alive) return;
        setErr('Unauthorized');
        window.location.href = '/login';
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">WarehouseHub</h1>
      {err && <p className="text-red-600">{err}</p>}
      {me && (
        <pre className="mt-4 p-4 bg-gray-100 rounded">
          {JSON.stringify(me, null, 2)}
        </pre>
      )}
    </div>
  );
}
