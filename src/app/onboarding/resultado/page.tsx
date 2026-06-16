'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Dashboard = {
  empty: boolean;
  receita: number;
  despesas: number;
  pessoal: number;
  sobrou: number;
  meiPercent: number;
  yearReceita: number;
  topClientes: { nome: string; total: number }[];
  topDespesas: { categoria: string; total: number }[];
};

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ImportInfo() {
  const params = useSearchParams();
  const novas = params.get('novas');
  const duplicadas = params.get('duplicadas');

  if (!novas && !duplicadas) return null;

  const nNovas = novas ? parseInt(novas, 10) : 0;
  const nDups = duplicadas ? parseInt(duplicadas, 10) : 0;

  if (nNovas === 0 && nDups > 0) {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-2xl shrink-0">ℹ️</span>
          <div className="flex-1">
            <div className="font-bold text-blue-900 text-sm">Tudo ja estava aqui!</div>
            <div className="text-xs text-blue-800">
              Encontramos {nDups} {nDups === 1 ? 'transacao' : 'transacoes'} no extrato
              mas {nDups === 1 ? 'ela ja estava' : 'todas ja estavam'} salvas.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (nNovas > 0) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-4 animate-pop-in">
        <div className="flex items-start gap-2">
          <span className="text-2xl shrink-0">✨</span>
          <div className="flex-1">
            <div className="font-bold text-green-900 text-sm">
              {nNovas} {nNovas === 1 ? 'nova transacao' : 'novas transacoes'} salvas!
            </div>
            {nDups > 0 && (
              <div className="text-xs text-green-800">
                ({nDups} {nDups === 1 ? 'ja existia' : 'ja existiam'} e foram ignoradas)
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function ResultadoPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <main className="flex-1 p-6">
        <p className="text-red-600">Erro: {error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gradient-hero">
        <div className="text-gray-400">Carregando...</div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-5 pt-6 pb-12 bg-gradient-to-b from-yellow-50 via-white to-purple-50">
      <div className="text-center mb-6 animate-pop-in">
        <div className="text-5xl mb-2">🎉</div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          Olha o que <span className="bg-gradient-pink bg-clip-text text-transparent">descobrimos</span>:
        </h1>
      </div>

      <Suspense fallback={null}>
        <ImportInfo />
      </Suspense>

      <div className="space-y-3 mb-6">
        <div className="bg-gradient-money text-white rounded-3xl p-5 shadow-glow-money animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="text-sm font-semibold mb-1 opacity-90">💰 Voce recebeu</div>
          <div className="text-4xl font-extrabold">
            {formatBRL(data.receita)}
          </div>
        </div>

        <div className="bg-gradient-warning text-white rounded-3xl p-5 shadow-glow-yellow animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <div className="text-sm font-semibold mb-1 opacity-90">📉 Gastou no trabalho</div>
          <div className="text-3xl font-extrabold">
            {formatBRL(data.despesas)}
          </div>
        </div>

        <div className="bg-gradient-cool text-white rounded-3xl p-6 shadow-glow-cool animate-slide-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <div className="text-sm font-semibold mb-2 opacity-90">✨ SOBROU PRA VOCE</div>
          <div className="text-5xl font-extrabold">
            {formatBRL(data.sobrou)}
          </div>
        </div>
      </div>

      {data.topClientes.length > 0 && (
        <div className="bg-white border-2 border-pink-200 rounded-3xl p-5 mb-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.4s', opacity: 0 }}>
          <div className="text-xs font-semibold text-pink-600 mb-2 uppercase tracking-wide">👑 Sua melhor cliente</div>
          <div className="font-bold text-lg text-gray-900">
            {data.topClientes[0].nome}
          </div>
          <div className="text-pink-600 font-extrabold text-2xl">
            {formatBRL(data.topClientes[0].total)}
          </div>
        </div>
      )}

      {data.meiPercent > 0 && (
        <div className={`rounded-3xl p-5 mb-8 shadow-soft animate-slide-up ${
          data.meiPercent > 90 ? 'bg-red-50 border-2 border-red-300'
          : data.meiPercent > 70 ? 'bg-yellow-50 border-2 border-yellow-300'
          : 'bg-blue-50 border-2 border-blue-300'
        }`} style={{ animationDelay: '0.5s', opacity: 0 }}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-bold">⚠️ Limite MEI</div>
            <div className="text-xl font-extrabold">{data.meiPercent}%</div>
          </div>
          <div className="bg-white rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${data.meiPercent > 90 ? 'bg-red-500' : data.meiPercent > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
              style={{ width: `${data.meiPercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-2 font-medium">
            R$ {data.yearReceita.toFixed(0)} de R$ 81.000 do limite anual
          </div>
        </div>
      )}

      <Link
        href="/onboarding/cadastro"
        className="block bg-gradient-pink text-white font-bold py-5 rounded-3xl text-center shadow-glow-pink hover:scale-105 active:scale-95 transition text-lg animate-slide-up"
        style={{ animationDelay: '0.6s', opacity: 0 }}
      >
        Ver tudo organizado →
      </Link>
    </main>
  );
}
