'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const OPCOES = [
  // Beleza
  { value: 'manicure', label: 'Manicure / Pedicure', emoji: '💅', cor: 'bg-pink-100 border-pink-300' },
  { value: 'cabelo', label: 'Cabelo / Barbeiro', emoji: '💇', cor: 'bg-orange-100 border-orange-300' },
  { value: 'estetica', label: 'Estetica / Sobrancelha', emoji: '✨', cor: 'bg-purple-100 border-purple-300' },
  { value: 'massagem', label: 'Massagem / Spa', emoji: '💆', cor: 'bg-teal-100 border-teal-300' },
  { value: 'maquiagem', label: 'Maquiadora', emoji: '💄', cor: 'bg-rose-100 border-rose-300' },

  // Servicos
  { value: 'motorista', label: 'Motorista de app', emoji: '🚗', cor: 'bg-blue-100 border-blue-300' },
  { value: 'entregador', label: 'Entregador', emoji: '🛵', cor: 'bg-yellow-100 border-yellow-300' },
  { value: 'professor', label: 'Professor particular', emoji: '📚', cor: 'bg-indigo-100 border-indigo-300' },
  { value: 'personal', label: 'Personal trainer', emoji: '💪', cor: 'bg-red-100 border-red-300' },
  { value: 'faxineira', label: 'Diarista / Faxineira', emoji: '🧹', cor: 'bg-cyan-100 border-cyan-300' },
  { value: 'cozinheira', label: 'Cozinheira / Confeitaria', emoji: '👩‍🍳', cor: 'bg-amber-100 border-amber-300' },

  // Digital / Criativo
  { value: 'freelancer', label: 'Freelancer / Designer', emoji: '🎨', cor: 'bg-violet-100 border-violet-300' },
  { value: 'dev', label: 'Programador / Dev', emoji: '💻', cor: 'bg-slate-100 border-slate-300' },
  { value: 'fotografo', label: 'Fotografo / Filmmaker', emoji: '📸', cor: 'bg-emerald-100 border-emerald-300' },
  { value: 'creator', label: 'Criador de conteudo', emoji: '🎬', cor: 'bg-fuchsia-100 border-fuchsia-300' },

  // Outros
  { value: 'costureira', label: 'Costureira', emoji: '🧵', cor: 'bg-lime-100 border-lime-300' },
  { value: 'mecanico', label: 'Mecanico / Tecnico', emoji: '🔧', cor: 'bg-gray-100 border-gray-300' },
  { value: 'vendedor', label: 'Vendedor / Revendedor', emoji: '🛍️', cor: 'bg-green-100 border-green-300' },
  { value: 'outros', label: 'Outros', emoji: '🌟', cor: 'bg-stone-100 border-stone-300' },
];

export default function ProfissaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function escolher(profissao: string) {
    setLoading(profissao);
    await fetch('/api/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissao }),
    });
    router.push('/onboarding/preview');
  }

  return (
    <main className="flex-1 flex flex-col px-5 pt-6 pb-12 bg-gradient-to-b from-white via-purple-50/30 to-white">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-6 text-left w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
        aria-label="Voltar"
      >
        ←
      </button>

      <div className="mb-2 text-sm font-semibold text-secondary-600">Passo 1 de 4</div>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
        Voce trabalha com<br />
        <span className="bg-gradient-cool bg-clip-text text-transparent">o que?</span>
      </h1>
      <p className="text-gray-600 mb-6 text-sm">
        A gente ajusta o app pra sua realidade.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {OPCOES.map((op, i) => (
          <button
            key={op.value}
            onClick={() => escolher(op.value)}
            disabled={loading !== null}
            className={`${op.cor} border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition hover:scale-105 active:scale-95 disabled:opacity-40 animate-pop-in`}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className="text-4xl" aria-hidden>{op.emoji}</span>
            <span className="text-sm font-semibold text-gray-800 text-center leading-tight">
              {op.label}
            </span>
            {loading === op.value && (
              <span className="text-secondary-600 text-xs animate-pulse">carregando...</span>
            )}
          </button>
        ))}
      </div>
    </main>
  );
}
