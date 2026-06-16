'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const PGMEI_URL = 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/';
const PGDAS_URL = 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgdasd.app/default.aspx';

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

type DASPayment = {
  id: string;
  month: number;
  year: number;
  value: number;
  dueDate: string;
  paidAt: string | null;
  regime?: string | null;
  rbt12?: number | null;
  aliquota?: number | null;
  status: 'em_dia' | 'proximo' | 'urgente' | 'atrasado' | 'pago';
  multa: number;
  total: number;
};

type DASData = {
  payments: DASPayment[];
  current: DASPayment | null;
  regime: string;
  atividade: string | null;
  simplesAnexo: string | null;
  valorMensal: number;
  alertaMEI: {
    nivel: 'atencao' | 'urgente';
    percent: number;
    receita: number;
    limite: number;
    message: string;
  } | null;
  receitaMesCorrente: number;
};

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function diasRestantes(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; emoji: string; label: string }> = {
  pago: { bg: 'bg-green-50 border-green-300', text: 'text-green-800', emoji: '✅', label: 'Pago' },
  em_dia: { bg: 'bg-blue-50 border-blue-300', text: 'text-blue-800', emoji: '📅', label: 'Em dia' },
  proximo: { bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-800', emoji: '⚠️', label: 'Proximo' },
  urgente: { bg: 'bg-orange-50 border-orange-300', text: 'text-orange-800', emoji: '🔥', label: 'Urgente' },
  atrasado: { bg: 'bg-red-50 border-red-300', text: 'text-red-800', emoji: '🚨', label: 'Atrasado' },
};

export default function DASPage() {
  const router = useRouter();
  const [data, setData] = useState<DASData | null>(null);

  async function load() {
    const res = await fetch('/api/das');
    const d = await res.json();
    setData(d);
  }

  useEffect(() => {
    load();
  }, []);

  async function marcarPago(id: string, paid: boolean) {
    await fetch(`/api/das/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paidAt: paid ? new Date().toISOString() : null,
      }),
    });
    await load();
  }

  if (!data) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Carregando...</div>
      </main>
    );
  }

  // Se ainda nao escolheu regime, manda pra tela de setup
  const naoConfigurou =
    !data.regime ||
    (data.regime === 'mei' && !data.atividade) ||
    (data.regime === 'simples' && !data.simplesAnexo);

  if (naoConfigurou) {
    return (
      <main className="flex-1 p-5">
        <button onClick={() => router.back()} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition">
          ←
        </button>

        <div className="text-center mb-8 mt-8">
          <div className="text-7xl mb-4 animate-float">📋</div>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            Configurar <span className="bg-gradient-cool bg-clip-text text-transparent">DAS</span>
          </h1>
          <p className="text-gray-600 text-sm px-4">
            Em 1 minuto a gente calcula seu DAS automatico todo mes.
          </p>
        </div>

        <button
          onClick={() => router.push('/app/das/regime')}
          className="w-full bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool hover:scale-105 active:scale-95 transition text-lg"
        >
          Configurar agora →
        </button>
      </main>
    );
  }

  const current = data.current;
  const config = current ? STATUS_CONFIG[current.status] : null;
  const isSimples = data.regime === 'simples';

  return (
    <main className="flex-1 p-5">
      <button onClick={() => router.back()} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition">
        ←
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            DAS {isSimples ? 'Simples' : 'MEI'}
          </h1>
          <p className="text-sm text-gray-500">
            {isSimples ? `Anexo ${data.simplesAnexo}` : 'Sua guia mensal'}
          </p>
        </div>
        <button
          onClick={() => router.push('/app/das/regime')}
          className="text-xs text-secondary-600 underline"
        >
          Mudar regime
        </button>
      </div>

      {/* Alerta MEI - quando esta perto de estourar */}
      {data.alertaMEI && (
        <div className={`rounded-3xl p-5 mb-4 border-2 shadow-soft animate-pop-in ${
          data.alertaMEI.nivel === 'urgente'
            ? 'bg-red-50 border-red-300'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-3xl shrink-0">
              {data.alertaMEI.nivel === 'urgente' ? '🚨' : '⚠️'}
            </span>
            <div className="flex-1">
              <div className={`font-bold mb-1 ${
                data.alertaMEI.nivel === 'urgente' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {data.alertaMEI.message}
              </div>
              <div className="text-sm text-gray-700 mb-2">
                Voce ja faturou {formatBRL(data.alertaMEI.receita)} em {new Date().getFullYear()}
                {' '}({data.alertaMEI.percent}% do limite).
              </div>
              <div className="bg-white rounded-full h-2 overflow-hidden mb-3">
                <div
                  className={`h-2 rounded-full ${
                    data.alertaMEI.percent > 90 ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${data.alertaMEI.percent}%` }}
                />
              </div>
              {data.alertaMEI.nivel === 'urgente' && (
                <button
                  onClick={() => router.push('/app/das/regime')}
                  className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:scale-105 transition"
                >
                  Migrar pro Simples Nacional →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card do mes corrente */}
      {current && config && (
        <div className={`${config.bg} border-2 rounded-3xl p-6 mb-4 shadow-soft animate-pop-in`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{config.emoji}</span>
            <span className={`font-bold text-sm uppercase tracking-wide ${config.text}`}>
              {config.label}
            </span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 capitalize mb-1">
            DAS de {MESES[current.month - 1]} {current.year}
          </h2>

          <div className="text-sm text-gray-700 mb-4">
            Vence em {new Date(current.dueDate).toLocaleDateString('pt-BR')}
            {current.status === 'atrasado' && ' (atrasado!)'}
            {current.status !== 'atrasado' && current.status !== 'pago' && ` (faltam ${diasRestantes(current.dueDate)} dias)`}
          </div>

          <div className="bg-white/60 rounded-2xl p-4 mb-4">
            <div className="text-xs text-gray-600 mb-1">Valor a pagar</div>
            <div className="text-3xl font-extrabold text-gray-900">
              {formatBRL(current.total)}
            </div>
            {current.multa > 0 && (
              <div className="text-xs text-red-600 font-medium mt-1">
                + {formatBRL(current.multa)} de multa/juros
              </div>
            )}

            {/* Detalhes do calculo Simples */}
            {isSimples && current.aliquota !== null && current.aliquota !== undefined && (
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                <div className="text-xs text-gray-600">
                  Receita do mes: {formatBRL(data.receitaMesCorrente)}
                </div>
                <div className="text-xs text-gray-600">
                  Aliquota efetiva: {(current.aliquota * 100).toFixed(2)}%
                </div>
                {current.rbt12 != null && (
                  <div className="text-xs text-gray-600">
                    RBT12: {formatBRL(current.rbt12)}
                  </div>
                )}
              </div>
            )}
          </div>

          {!current.paidAt ? (
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/app/das/pagar/${current.id}`)}
                className="w-full bg-gradient-cool text-white font-bold py-4 rounded-2xl shadow-glow-cool transition hover:scale-105 active:scale-95"
              >
                💳 Gerar codigo de pagamento
              </button>
              <button
                onClick={() => marcarPago(current.id, true)}
                className="w-full bg-white border-2 border-green-300 text-green-700 font-bold py-4 rounded-2xl transition hover:scale-105 active:scale-95"
              >
                ✓ Ja paguei, marcar como pago
              </button>
              <a
                href={isSimples ? PGDAS_URL : PGMEI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center text-gray-500 underline text-sm py-2"
              >
                🔗 Ou abrir {isSimples ? 'PGDAS' : 'PGMEI'} oficial
              </a>
            </div>
          ) : (
            <button
              onClick={() => marcarPago(current.id, false)}
              className="w-full text-gray-600 underline text-sm py-2"
            >
              Desmarcar como pago
            </button>
          )}
        </div>
      )}

      {/* Info do regime */}
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">💡</span>
          <div className="flex-1">
            {isSimples ? (
              <>
                <div className="text-sm font-semibold text-purple-900 mb-1">
                  Simples Nacional — Anexo {data.simplesAnexo}
                </div>
                <div className="text-xs text-purple-700 leading-relaxed">
                  Seu DAS varia conforme quanto voce fatura no mes.
                  Lance suas receitas pra ter o valor certo.
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-purple-900 mb-1">
                  Seu DAS mensal: {formatBRL(data.valorMensal)}
                </div>
                <div className="text-xs text-purple-700">
                  Valor fixo, baseado na sua atividade MEI ({data.atividade}).
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Historico */}
      <h3 className="text-lg font-bold text-gray-900 mb-3">Historico</h3>
      <div className="space-y-2">
        {data.payments.map((p) => {
          const cfg = STATUS_CONFIG[p.status];
          return (
            <div
              key={p.id}
              className={`bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between ${
                p.id === current?.id ? 'ring-2 ring-secondary-400' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-2xl shrink-0">{cfg.emoji}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 capitalize">
                    {MESES[p.month - 1]} {p.year}
                  </div>
                  <div className="text-xs text-gray-500">
                    {p.paidAt
                      ? `Pago em ${new Date(p.paidAt).toLocaleDateString('pt-BR')}`
                      : `Vence ${new Date(p.dueDate).toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className="font-bold text-gray-900">{formatBRL(p.value)}</div>
                {!p.paidAt && (
                  <button
                    onClick={() => marcarPago(p.id, true)}
                    className="text-xs text-green-600 font-semibold underline"
                  >
                    Marcar pago
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center mt-8">
        🔗 Boleto oficial:{' '}
        <a
          href={isSimples ? PGDAS_URL : PGMEI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {isSimples ? 'PGDAS-D' : 'PGMEI'}
        </a>
      </p>
    </main>
  );
}
