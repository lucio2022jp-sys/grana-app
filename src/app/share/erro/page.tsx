'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const MENSAGENS: Record<string, string> = {
  arquivo_grande: 'O arquivo passou de 20MB. Tenta exportar so o ultimo mes.',
  parse: 'Nao consegui ler esse PDF. Pode estar protegido ou em formato estranho.',
  geral: 'Aconteceu algo inesperado. Tenta de novo.',
};

function ErroInner() {
  const params = useSearchParams();
  const msg = params.get('msg') ?? 'geral';
  return (
    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl p-4">
      {MENSAGENS[msg] ?? MENSAGENS.geral}
    </div>
  );
}

export default function ShareErroPage() {
  return (
    <main className="flex-1 flex flex-col p-6 bg-gradient-to-b from-white via-red-50/30 to-white">
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">😞</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          Nao deu certo
        </h1>
      </div>

      <Suspense fallback={null}>
        <ErroInner />
      </Suspense>

      <Link
        href="/onboarding/upload"
        className="block bg-gradient-cool text-white font-bold py-4 rounded-3xl text-center shadow-glow-cool mt-6"
      >
        Tentar de novo
      </Link>

      <Link
        href="/app"
        className="block text-gray-500 underline text-sm text-center mt-4"
      >
        Voltar pra home
      </Link>
    </main>
  );
}
