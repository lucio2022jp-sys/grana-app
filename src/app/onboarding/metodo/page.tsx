'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MetodoPage() {
  const router = useRouter();

  return (
    <main className="flex-1 flex flex-col px-5 pt-6 pb-12 bg-gradient-to-b from-white via-blue-50/30 to-white">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-6 text-left w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-2 text-sm font-semibold text-secondary-600">Passo 4 de 4</div>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-3 leading-tight">
        Vamos descobrir<br />
        <span className="bg-gradient-money bg-clip-text text-transparent">
          quanto voce ganhou
        </span>
      </h1>
      <p className="text-gray-600 mb-8 text-base">
        Escolhe o jeito mais facil pra voce.
      </p>

      <Link
        href="/onboarding/upload"
        className="bg-gradient-cool text-white rounded-3xl p-6 mb-4 shadow-glow-cool transition hover:scale-105 active:scale-95 relative overflow-hidden animate-pop-in"
      >
        <div className="absolute top-2 right-3 bg-accent-yellow text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
          ⚡ MAIS RAPIDO
        </div>
        <div className="flex items-start gap-4 mt-2">
          <div className="text-5xl filter drop-shadow">📄</div>
          <div className="text-left flex-1">
            <div className="font-bold text-xl mb-1">Importar extrato Pix</div>
            <div className="text-blue-100 text-sm">
              Em 30 segundos voce ja ve seus numeros
            </div>
          </div>
        </div>
      </Link>

      <Link
        href="/onboarding/manual"
        className="bg-white border-2 border-gray-200 hover:border-secondary-400 rounded-3xl p-6 transition hover:scale-105 active:scale-95 shadow-soft animate-pop-in"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="flex items-start gap-4">
          <div className="text-5xl">✏️</div>
          <div className="text-left flex-1">
            <div className="font-bold text-xl text-gray-800 mb-1">Lancar manualmente</div>
            <div className="text-gray-500 text-sm">
              Pra quem prefere fazer aos pouquinhos
            </div>
          </div>
        </div>
      </Link>

      <Link
        href="/app"
        className="mt-8 text-gray-500 underline text-sm text-center"
      >
        Pular por enquanto
      </Link>
    </main>
  );
}
