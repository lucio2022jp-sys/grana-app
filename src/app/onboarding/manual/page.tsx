'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FAIXAS = [
  { value: 1500, label: 'Menos de R$ 2.000', emoji: '🌱', cor: 'bg-green-100 border-green-300' },
  { value: 3500, label: 'R$ 2.000 a R$ 5.000', emoji: '🌿', cor: 'bg-emerald-100 border-emerald-300' },
  { value: 7500, label: 'R$ 5.000 a R$ 10.000', emoji: '🌳', cor: 'bg-teal-100 border-teal-300' },
  { value: 15000, label: 'Mais de R$ 10.000', emoji: '🚀', cor: 'bg-blue-100 border-blue-300' },
];

export default function ManualPage() {
  const router = useRouter();
  const [escolhido, setEscolhido] = useState<number | null>(null);

  function continuar(faixa: number) {
    setEscolhido(faixa);
    if (typeof window !== 'undefined') {
      localStorage.setItem('faixa_estimada', String(faixa));
    }
    setTimeout(() => router.push('/app'), 600);
  }

  return (
    <main className="flex-1 flex flex-col px-5 pt-6 pb-12 bg-gradient-to-b from-white via-green-50/30 to-white">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-6 text-left w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
        Quanto voce <span className="bg-gradient-money bg-clip-text text-transparent">fatura por mes</span>?
      </h1>
      <p className="text-gray-600 mb-8 text-sm">
        Pra voce ver como o app vai ficar quando comecar.
      </p>

      <div className="space-y-3">
        {FAIXAS.map((f, i) => (
          <button
            key={f.value}
            onClick={() => continuar(f.value)}
            disabled={escolhido !== null}
            className={`w-full ${f.cor} border-2 rounded-2xl py-5 px-5 text-left transition hover:scale-105 active:scale-95 animate-pop-in ${
              escolhido === f.value ? 'ring-4 ring-secondary-400' : ''
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">{f.emoji}</span>
              <span className="font-bold text-gray-800 text-base">{f.label}</span>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
