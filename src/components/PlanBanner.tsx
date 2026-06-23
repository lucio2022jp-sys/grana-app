'use client';

/**
 * Banner de status do plano. Mostra:
 *  - Trial Pro com dias restantes (durante os 7 dias)
 *  - Contador "X de 20 lançamentos usados" (free pós-trial)
 *  - Aviso "Limite atingido" com CTA pra upgrade
 *  - Nada (Pro pago — sem ruído)
 *
 * O componente faz fetch leve a `/api/billing/status` no mount. Não é
 * crítico: se falhar, esconde silencioso.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Status = {
  plan: 'free' | 'pro';
  isPro: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number;
  monthlyNewTxCount: number;
  monthlyNewTxLimit: number | null;
  monthlyNewTxRemaining: number | null;
};

export default function PlanBanner() {
  const [s, setS] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/billing/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setS(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!s) return null;

  // Pro pago — esconde, sem ruído.
  if (s.plan === 'pro' && !s.trialActive) return null;

  // Trial ativo
  if (s.trialActive) {
    // Modo URGENTE: faltam 3 dias ou menos. Banner muda de cor e tom pra
    // pressionar conversão (sem cair em desespero).
    const urgente = s.trialDaysLeft <= 3;

    if (urgente) {
      const horasFaltando = s.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(s.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60)))
        : null;

      return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-3 mb-4 flex items-center justify-between gap-3 shadow-[0_4px_16px_-4px_rgba(245,158,11,0.4)]">
          <div className="text-sm min-w-0">
            <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
              ⏰ Seu trial Pro acaba {s.trialDaysLeft === 0 ? 'hoje' : s.trialDaysLeft === 1 ? 'amanha' : `em ${s.trialDaysLeft} dias`}
            </div>
            <div className="text-amber-800 text-xs truncate">
              {s.trialDaysLeft === 0 && horasFaltando !== null
                ? `Faltam ~${horasFaltando}h. Depois disso volta pro Free (20/mes).`
                : 'Garanta Pro por R$ 17,90/mes antes de virar Free.'}
            </div>
          </div>
          <Link
            href="/app/upgrade"
            className="text-xs font-extrabold bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 rounded-xl hover:from-amber-500 hover:to-orange-500 transition shrink-0 shadow-[0_4px_12px_-2px_rgba(245,158,11,0.5)] active:scale-95"
          >
            Garantir Pro →
          </Link>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-2xl p-3 mb-4 flex items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-semibold text-violet-900">
            🎁 Trial Pro ativo
          </div>
          <div className="text-violet-700 text-xs">
            {s.trialDaysLeft} {s.trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'} com lancamentos ilimitados.
          </div>
        </div>
        <Link
          href="/app/upgrade"
          className="text-xs font-semibold bg-violet-600 text-white px-3 py-2 rounded-xl hover:bg-violet-700 transition shrink-0"
        >
          Ver Pro
        </Link>
      </div>
    );
  }

  // Free pós-trial, limite atingido
  if (s.monthlyNewTxRemaining === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 flex items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-semibold text-amber-900">
            ⚠️ Limite mensal atingido
          </div>
          <div className="text-amber-700 text-xs">
            Voce usou {s.monthlyNewTxCount} de {s.monthlyNewTxLimit} lancamentos do mes. Faca upgrade pra Pro.
          </div>
        </div>
        <Link
          href="/app/upgrade"
          className="text-xs font-semibold bg-amber-600 text-white px-3 py-2 rounded-xl hover:bg-amber-700 transition shrink-0"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  // Free pós-trial, ainda tem cota — banner leve com contador
  const limit = s.monthlyNewTxLimit ?? 20;
  const pct = Math.min(100, Math.round((s.monthlyNewTxCount / limit) * 100));
  const baixo = (s.monthlyNewTxRemaining ?? 0) <= 5;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-xs text-gray-600">
          <span className="font-semibold text-gray-900">
            {s.monthlyNewTxCount}/{limit}
          </span>{' '}
          lancamentos do mes
        </div>
        <Link
          href="/app/upgrade"
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition shrink-0 ${
            baixo
              ? 'bg-violet-600 text-white hover:bg-violet-700'
              : 'text-violet-700 hover:bg-violet-50'
          }`}
        >
          {baixo ? 'Upgrade Pro' : 'Ver Pro'}
        </Link>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            baixo ? 'bg-amber-500' : 'bg-violet-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
