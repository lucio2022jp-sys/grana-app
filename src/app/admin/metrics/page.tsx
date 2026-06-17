'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Summary = {
  days: number;
  uploads: number;
  totalTxs: number;
  breakdown: {
    history: { count: number; pct: number };
    heuristic: { count: number; pct: number };
    ai: { count: number; pct: number };
  };
  ai: { calls: number; txs: number; avgBatchSize: number };
  corrections: { count: number; pct: number };
  memoria: {
    pares: number;
    usuariosAtivos: number;
    topTransicoes: Array<{ label: string; count: number }>;
  };
};

type SeriePonto = { date: string; total: number; ai: number; corrected: number };

const FAIXAS = [7, 30, 90];

export default function AdminMetricsPage() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<SeriePonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);
    fetch(`/api/admin/metrics?days=${days}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.push('/admin/login');
          return null;
        }
        if (!r.ok) throw new Error('Falha ao carregar metricas');
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setSummary(data.summary);
        setSeries(data.series);
      })
      .catch((e) => {
        if (!cancelled) setErro(e.message ?? 'Erro');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, router]);

  return (
    <div className="max-w-5xl mx-auto p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Métricas do classificador</h1>
          <p className="text-sm text-gray-500">
            Quanto cada camada está resolvendo, custo de IA e taxa de correção do usuário.
          </p>
        </div>
        <Link href="/admin/parceiros" className="text-sm text-purple-600 hover:underline">
          ← Parceiros
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {FAIXAS.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              days === d
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
            }`}
          >
            {d} dias
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">Carregando…</p>}
      {erro && <p className="text-red-600">{erro}</p>}

      {summary && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card label="Uploads" value={summary.uploads.toLocaleString('pt-BR')} />
            <Card label="Transações" value={summary.totalTxs.toLocaleString('pt-BR')} />
            <Card
              label="Chamadas de IA"
              value={summary.ai.calls.toLocaleString('pt-BR')}
              hint={
                summary.ai.avgBatchSize > 0
                  ? `~${summary.ai.avgBatchSize.toFixed(1)} txs/chamada`
                  : undefined
              }
            />
            <Card
              label="Correções"
              value={`${summary.corrections.count.toLocaleString('pt-BR')}`}
              hint={`${summary.corrections.pct.toFixed(1)}% do total`}
            />
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-8">
            <h2 className="font-medium mb-4">Distribuição por camada</h2>
            <Bar
              label="Histórico / documento"
              count={summary.breakdown.history.count}
              pct={summary.breakdown.history.pct}
              color="bg-emerald-500"
            />
            <Bar
              label="Heurística"
              count={summary.breakdown.heuristic.count}
              pct={summary.breakdown.heuristic.pct}
              color="bg-sky-500"
            />
            <Bar
              label="IA (Claude)"
              count={summary.breakdown.ai.count}
              pct={summary.breakdown.ai.pct}
              color="bg-purple-500"
            />
            <p className="text-xs text-gray-500 mt-3">
              Quanto maior a fatia das duas primeiras, menor o custo de IA — e melhor a heurística está aprendendo.
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-8">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-medium">Memória negativa</h2>
              <span className="text-xs text-gray-500">
                {summary.memoria.pares.toLocaleString('pt-BR')} pares · {summary.memoria.usuariosAtivos} usuário(s)
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Cada vez que o usuário corrige uma sugestão da IA, o par fica salvo e entra no prompt
              do próximo upload pra evitar erros repetidos.
            </p>
            {summary.memoria.topTransicoes.length === 0 ? (
              <p className="text-sm text-gray-500">Sem correções no período.</p>
            ) : (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">
                  Top transições (sugestão → correção)
                </div>
                {summary.memoria.topTransicoes.map((t) => (
                  <div
                    key={t.label}
                    className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0"
                  >
                    <code className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-700">
                      {t.label}
                    </code>
                    <span className="text-gray-500">{t.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <h2 className="font-medium mb-4">Por dia</h2>
            {series.length === 0 ? (
              <p className="text-sm text-gray-500">Sem dados nesse período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="py-2">Data</th>
                    <th className="py-2 text-right">Txs</th>
                    <th className="py-2 text-right">IA</th>
                    <th className="py-2 text-right">Corrigidas</th>
                    <th className="py-2 text-right">% IA</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((p) => (
                    <tr key={p.date} className="border-b border-gray-50 last:border-0">
                      <td className="py-2">{p.date}</td>
                      <td className="py-2 text-right">{p.total}</td>
                      <td className="py-2 text-right">{p.ai}</td>
                      <td className="py-2 text-right">{p.corrected}</td>
                      <td className="py-2 text-right text-gray-500">
                        {p.total > 0 ? ((p.ai / p.total) * 100).toFixed(0) : '0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

function Bar({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-gray-500">
          {count.toLocaleString('pt-BR')} · {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
