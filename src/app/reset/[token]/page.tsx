'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';

  const [password, setPassword] = useState('');
  const [confirma, setConfirma] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (password.length < 6) {
      setErro('A senha precisa ter ao menos 6 caracteres.');
      return;
    }
    if (password !== confirma) {
      setErro('As senhas nao batem.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.message ?? 'Erro ao redefinir senha.');
        setLoading(false);
        return;
      }
      setPronto(true);
      // Cookie de sessao ja foi setado pela API. Manda direto pro app.
      setTimeout(() => router.push('/app'), 900);
    } catch (e: any) {
      setErro(e?.message ?? 'Erro de rede.');
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col px-5 pt-10 pb-12 bg-gradient-to-b from-pink-50 via-white to-blue-50">
      <div className="text-center mb-8 animate-pop-in">
        <div className="text-6xl mb-3">{pronto ? '✅' : '🔐'}</div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
          {pronto ? 'Senha atualizada' : 'Nova senha'}
        </h1>
        <p className="text-gray-600 text-sm">
          {pronto ? 'Entrando...' : 'Crie uma senha nova pra sua conta.'}
        </p>
      </div>

      {!pronto && (
        <form onSubmit={salvar} className="space-y-4">
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

          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-2">Confirmar senha</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              placeholder="Repete a senha"
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
            disabled={loading || !password || !confirma}
            className="w-full bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-lg"
          >
            {loading ? '⏳ Salvando...' : 'Redefinir senha 🔓'}
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
