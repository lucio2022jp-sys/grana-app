'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PreviewPage() {
  const router = useRouter();

  return (
    <main className="flex-1 flex flex-col px-5 pt-6 pb-12 bg-gradient-to-b from-white via-pink-50/40 to-white">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 text-left w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-2 text-sm font-semibold text-secondary-600">Passo 2 de 4</div>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
        Olha o que voce<br />
        <span className="bg-gradient-pink bg-clip-text text-transparent">
          vai descobrir
        </span> 👀
      </h1>
      <p className="text-gray-600 mb-6 text-sm">
        Em 30 segundos voce ve assim, com seus numeros:
      </p>

      {/* Mini-dashboard preview - dados ficticios */}
      <div className="space-y-3 mb-6">
        <div className="bg-gradient-money text-white rounded-2xl p-4 shadow-glow-money animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="text-xs font-semibold opacity-90">💰 Voce recebeu</div>
          <div className="text-2xl font-extrabold">{formatBRL(4890)}</div>
        </div>

        <div className="bg-gradient-warning text-white rounded-2xl p-4 shadow-glow-yellow animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <div className="text-xs font-semibold opacity-90">📉 Gastou no trabalho</div>
          <div className="text-2xl font-extrabold">{formatBRL(720)}</div>
        </div>

        <div className="bg-gradient-cool text-white rounded-2xl p-5 shadow-glow-cool animate-slide-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <div className="text-xs font-semibold opacity-90">✨ SOBROU PRA VOCE</div>
          <div className="text-3xl font-extrabold">{formatBRL(4170)}</div>
        </div>

        <div className="bg-white border-2 border-pink-200 rounded-2xl p-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.4s', opacity: 0 }}>
          <div className="text-xs font-semibold text-pink-600 mb-1 uppercase tracking-wide">👑 Sua melhor cliente</div>
          <div className="font-bold text-gray-900">Maria Silva</div>
          <div className="text-pink-600 font-extrabold">{formatBRL(480)}</div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-bold">⚠️ Limite MEI</div>
            <div className="text-xl font-extrabold">67%</div>
          </div>
          <div className="bg-white rounded-full h-2 overflow-hidden">
            <div className="h-2 rounded-full bg-yellow-500" style={{ width: '67%' }} />
          </div>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 mb-6">
        <p className="text-xs text-purple-800 text-center font-medium">
          ☝️ Esses sao numeros de exemplo. Os seus aparecem na proxima.
        </p>
      </div>

      <Link
        href="/onboarding/privacidade"
        className="block bg-gradient-pink text-white font-bold py-5 rounded-3xl text-center shadow-glow-pink hover:scale-105 active:scale-95 transition text-lg"
      >
        Quero ver os meus →
      </Link>
    </main>
  );
}
