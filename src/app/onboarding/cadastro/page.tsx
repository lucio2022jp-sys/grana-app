'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CadastroPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function salvar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Erro');
        setLoading(false);
        return;
      }
      router.push('/app');
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col px-5 pt-8 pb-12 bg-gradient-to-b from-pink-50 via-white to-blue-50">
      <div className="text-center mb-8 animate-pop-in">
        <div className="text-6xl mb-3">🔒</div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
          Quer salvar e ver<br />
          <span className="bg-gradient-pink bg-clip-text text-transparent">
            sempre que quiser?
          </span>
        </h1>
        <p className="text-gray-600 text-sm">
          Seus dados ficam so com voce. Nada de spam.
        </p>
      </div>

      <label className="block mb-4">
        <span className="block text-sm font-semibold text-gray-700 mb-2">Como voce se chama? 👋</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 text-lg shadow-soft transition"
        />
      </label>

      <label className="block mb-8">
        <span className="block text-sm font-semibold text-gray-700 mb-2">Email (opcional) 📧</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 text-lg shadow-soft transition"
        />
      </label>

      <button
        onClick={salvar}
        disabled={loading || !name}
        className="bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-lg"
      >
        {loading ? '⏳ Salvando...' : '🚀 Continuar'}
      </button>

      {error && <p className="text-red-600 text-sm mt-3 text-center">{error}</p>}

      <button
        onClick={() => router.push('/app')}
        className="mt-6 text-gray-500 underline text-sm text-center"
      >
        Pular
      </button>
    </main>
  );
}
