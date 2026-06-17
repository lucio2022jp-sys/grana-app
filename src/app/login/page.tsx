'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data?.message ?? 'Erro ao entrar.');
        setLoading(false);
        return;
      }
      router.push('/app');
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao entrar.');
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col px-5 pt-10 pb-12 bg-gradient-to-b from-pink-50 via-white to-blue-50">
      <div className="text-center mb-8 animate-pop-in">
        <div className="text-6xl mb-3">👋</div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
          Bem-vindo de volta
        </h1>
        <p className="text-gray-600 text-sm">Entra com sua conta pra ver suas transacoes.</p>
      </div>

      <form onSubmit={entrar} className="space-y-4">
        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-2">E-mail</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 text-lg shadow-soft transition"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-2">Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="******"
            className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 text-lg shadow-soft transition"
          />
        </label>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-lg"
        >
          {loading ? '⏳ Entrando...' : 'Entrar 🚪'}
        </button>
      </form>

      <div className="mt-8 text-center space-y-2">
        <p className="text-sm text-gray-600">
          Ainda nao tem conta?{' '}
          <Link href="/signup" className="text-secondary-600 font-semibold underline">
            Criar gratis
          </Link>
        </p>
        <p className="text-xs text-gray-400">
          ou{' '}
          <Link href="/demo" className="underline">
            ver demonstracao
          </Link>
        </p>
      </div>
    </main>
  );
}
