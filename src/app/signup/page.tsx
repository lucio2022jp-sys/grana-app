'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data?.message ?? 'Erro ao criar conta.');
        setLoading(false);
        return;
      }
      router.push('/onboarding/profissao');
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao criar conta.');
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col px-5 pt-10 pb-12 bg-gradient-to-b from-pink-50 via-white to-blue-50">
      <div className="text-center mb-8 animate-pop-in">
        <div className="text-6xl mb-3">🚀</div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
          Criar conta gratis
        </h1>
        <p className="text-gray-600 text-sm">Leva uns 30 segundos. Nao pedimos cartao.</p>
      </div>

      <form onSubmit={cadastrar} className="space-y-4">
        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-2">Como voce se chama?</span>
          <input
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 text-lg shadow-soft transition"
          />
        </label>

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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Pelo menos 6 caracteres"
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
          disabled={loading || !name || !email || password.length < 6}
          className="w-full bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-lg"
        >
          {loading ? '⏳ Criando...' : 'Criar conta 🎉'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          Ja tem conta?{' '}
          <Link href="/login" className="text-secondary-600 font-semibold underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
