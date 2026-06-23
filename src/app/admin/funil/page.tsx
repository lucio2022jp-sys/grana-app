'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Summary = {
  days: number;
  signups: number;
  trialAtivos: number;
  converteramNaJanela: number;
  trialExpirouSemConverter: number;
  taxaConversao: number;
  pagantesAtivos: number;
  mrr: number;
  churned: number;
  taxaChurn: number;
  precoPro: number;
};

type SeriePonto = { date: string; signups: number; pagos: number };

const FAIXAS = [7, 30, 90];

export default function AdminFunilPage() {
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
    fetch(`/api/admin/funil?days=${days}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.push('/admin/login');
          return null;
        }
        if (!r.ok) throw new Error('Falha ao carregar funil');
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

  const fmtBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="max-w-5xl mx-auto p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Funil de aquisição</h1>
          <p className="text-sm text-gray-500">
            Signups, trial ativo, conversão trial→pago, MRR e churn.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/parceiros" className="text-purple-600 hover:underline">
            Parceiros
          </Link>
          <Link href="/admin/metrics" className="text-purple-600 hover:underline">
            Métricas IA
          </Link>
        </div>
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
            <Card
              label="Signups"
              value={summary.signups.toLocaleString('pt-BR')}
              hint={`${summary.days} dias`}
            />
            <Card
              label="Trial ativos"
              value={summary.trialAtivos.toLocaleString('pt-BR')}
              hint="hoje"
            />
            <Card
              label="Pagantes"
              value={summary.pagantesAtivos.toLocaleString('pt-BR')}
              hint="hoje"
            />
            <Card
              label="MRR"
              value={fmtBRL(summary.mrr)}
              hint={`${fmtBRL(summary.precoPro)}/mês × ${summary.pagantesAtivos}`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card
              label="Conversão (trial → pago)"
              value={`${summary.taxaConversao.toFixed(1)}%`}
              hint={`${summary.converteramNaJanela} de ${summary.signups}`}
            />
            <Card
              label="Trial expirou sem pagar"
              value={summary.trialExpirouSemConverter.toLocaleString('pt-BR')}
              hint="oportunidade de win-back"
            />
            <Card
              label="Churn"
              value={`${summary.taxaChurn.toFixed(1)}%`}
              hint={`${summary.churned} cancelaram`}
            />
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
                    <th className="py-2 text-right">Signups</th>
                    <th className="py-2 text-right">Pagos</th>
                    <th className="py-2 text-right">% conv</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((p) => (
                    <tr key={p.date} className="border-b border-gray-50 last:border-0">
                      <td className="py-2">{p.date}</td>
                      <td className="py-2 text-right">{p.signups}</td>
                      <td className="py-2 text-right">{p.pagos}</td>
                      <td className="py-2 text-right text-gray-500">
                        {p.signups > 0 ? ((p.pagos / p.signups) * 100).toFixed(0) : '0'}%
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
