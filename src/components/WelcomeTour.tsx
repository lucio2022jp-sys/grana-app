'use client';

import { useEffect, useState } from 'react';

type Step = {
  emoji: string;
  title: string;
  body: string;
  highlight?: string; // descricao do alvo na bottom-nav, so visual
};

const STEPS: Step[] = [
  {
    emoji: '🏠',
    title: 'Esse aqui e o seu painel',
    body: 'Tudo que importa do mes aparece aqui: receita, despesa, sobrou, quanto guardar pra imposto e onde voce ta no limite MEI. Atualiza sozinho conforme voce lanca.',
  },
  {
    emoji: '＋',
    title: 'Lance em 3 segundos',
    body: 'Toca no botao Lancar pra registrar uma venda ou despesa. Da pra digitar, tirar foto da nota ou importar extrato do banco. A IA classifica e marca o que e seu salario.',
    highlight: 'Botao + no centro da barra de baixo.',
  },
  {
    emoji: '📋',
    title: 'DAS e DASN no automatico',
    body: 'Na aba DAS a gente avisa quando o boleto vence, quanto pagar e gera o resumo da DASN-SIMEI prontinho pra colar no portal todo comeco de ano.',
  },
  {
    emoji: '🎁',
    title: 'Voce ta no trial Pro',
    body: 'Por 7 dias tudo liberado: importacoes sem limite, IA na nota, recibo PDF, DASN. Sem cartao. Quando o trial acabar, vira Free com 20 lancamentos/mes ou vc assina por R$ 17,90.',
  },
];

export default function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        // Mostra so quando o usuario tem conta (logado) e ainda nao concluiu o tour.
        if (data?.user && !data.user.tourCompletedAt) {
          setOpen(true);
        }
      } catch {
        // silencia - sem tour eh melhor que crashar a home
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function finish() {
    setOpen(false);
    try {
      await fetch('/api/tour/complete', { method: 'POST' });
    } catch {
      // ignorar: na proxima visita tenta de novo
    }
  }

  if (!open) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-pop-in">
        <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 px-6 pt-7 pb-8 text-center text-white">
          <div className="text-6xl mb-3" aria-hidden>{s.emoji}</div>
          <h2 id="tour-title" className="text-2xl font-extrabold leading-tight">
            {s.title}
          </h2>
        </div>

        <div className="px-6 pt-5 pb-3">
          <p className="text-gray-700 leading-relaxed text-[15px]">{s.body}</p>
          {s.highlight ? (
            <p className="mt-3 text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
              👇 {s.highlight}
            </p>
          ) : null}
        </div>

        <div className="px-6 pb-5">
          <div className="flex items-center justify-center gap-1.5 mb-4" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-violet-600' : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={finish}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
            >
              Pular
            </button>
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep((v) => v + 1))}
              className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-lg shadow-violet-200 hover:shadow-violet-300 transition"
            >
              {isLast ? 'Bora começar' : 'Proximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
