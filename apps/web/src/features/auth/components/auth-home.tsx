'use client';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';

export function AuthHome() {
  const { me, error, loggingOut, signOut } = useAuthSession();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">WarehouseHub</h1>
        <button
          onClick={signOut}
          disabled={loggingOut}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
        >
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {me && (
        <pre className="mt-4 rounded bg-gray-100 p-4">
          {JSON.stringify(me, null, 2)}
        </pre>
      )}
    </div>
  );
}
