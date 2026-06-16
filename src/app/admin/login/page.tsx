'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'erro');
        setLoading(false);
        return;
      }
      router.push('/admin/parceiros');
    } catch (e: any) {
      setError(e.message ?? 'erro');
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 bg-gradient-to-b from-purple-50 to-white">
      <div className="w-full max-w-sm bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-soft">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🔐</div>
          <h1 className="text-2xl font-extrabold text-gray-900">Painel admin</h1>
          <p className="text-xs text-gray-500 mt-1">
            Acesso restrito ao dono do app.
          </p>
        </div>

        <form onSubmit={entrar} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-2">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 shadow-sm transition"
            />
          </label>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gradient-cool text-white font-bold py-4 rounded-2xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? '⏳ Entrando...' : '🔓 Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
