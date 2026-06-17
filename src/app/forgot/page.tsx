'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function pedir(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      // A API e generica de proposito: nao revela se o e-mail existe.
      setMensagem(
        data?.message ??
          'Se essa conta existir, voce vai receber um e-mail com o link pra redefinir a senha em ate alguns minutos.',
      );
      setEnviado(true);
    } catch {
      setMensagem('Erro de rede. Tenta de novo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col px-5 pt-10 pb-12 bg-gradient-to-b from-pink-50 via-white to-blue-50">
      <div className="text-center mb-8 animate-pop-in">
        <div className="text-6xl mb-3">🔑</div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
          Esqueci a senha
        </h1>
        <p className="text-gray-600 text-sm">
          Coloca o e-mail da conta. A gente manda o link pra criar uma senha nova.
        </p>
      </div>

      {enviado ? (
        <div className="bg-white border-2 border-secondary-200 rounded-3xl p-6 shadow-soft text-center">
          <div className="text-5xl mb-3">📬</div>
          <p className="text-gray-700 leading-relaxed">{mensagem}</p>
          <p className="text-xs text-gray-500 mt-4">
            Confira spam/promocoes. O link expira em 30 minutos.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block bg-gradient-cool text-white font-bold py-3 px-6 rounded-2xl"
          >
            Voltar pro login
          </Link>
        </div>
      ) : (
        <form onSubmit={pedir} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-lg"
          >
            {loading ? '⏳ Enviando...' : 'Enviar link 📧'}
          </button>
        </form>
      )}

      <div className="mt-8 text-center">
        <Link href="/login" className="text-sm text-gray-500 underline">
          Voltar pro login
        </Link>
      </div>
    </main>
  );
}
