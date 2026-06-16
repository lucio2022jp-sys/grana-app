'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

type MesAgregado = {
  mes: string;
  label: string;
  receita: number;
  despesa: number;
  lucro: number;
  txCount: number;
};

type Tendencia = {
  receitaPct: number | null;
  despesaPct: number | null;
  lucroPct: number | null;
  direcao: 'subindo' | 'descendo' | 'estavel' | 'sem_dados';
};

const PERIODOS = [
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
  { label: '24 meses', value: 24 },
];

function fmt(v: number) {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function fmtCompact(v: number) {
  if (Math.abs(v) >= 1000) {
    return `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`;
  }
  return `R$ ${v.toFixed(0)}`;
}

export default function EvolucaoPage() {
  const router = useRouter();
  const [meses, setMeses] = useState<MesAgregado[]>([]);
  const [tendencia, setTendencia] = useState<Tendencia | null>(null);
  const [periodo, setPeriodo] = useState(6);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/evolucao?meses=${periodo}`)
      .then((r) => r.json())
      .then((d) => {
        setMeses(d.meses ?? []);
        setTendencia(d.tendencia);
        setEmpty(d.empty);
        setLoading(false);
      });
  }, [periodo]);

  const mesAtual = meses[meses.length - 1];
  const mesAnterior = meses[meses.length - 2];

  // Pico de receita
  const maiorReceita = meses.reduce(
    (max, m) => (m.receita > max.receita ? m : max),
    { receita: 0, label: '-', mes: '' } as MesAgregado,
  );
  // Mes com maior lucro
  const maiorLucro = meses.reduce(
    (max, m) => (m.lucro > max.lucro ? m : max),
    { lucro: -Infinity, label: '-', mes: '' } as MesAgregado,
  );

  return (
    <main className="flex-1 p-5">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">📈 Evolucao</h1>
        <p className="text-sm text-gray-500">
          Como seu negocio esta crescendo (ou nao) ao longo do tempo.
        </p>
      </div>

      {/* Seletor de periodo */}
      <div className="flex gap-2 mb-5">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition ${
              periodo === p.value
                ? 'bg-gradient-cool text-white shadow-glow-cool'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-secondary-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Carregando...</div>
      ) : empty ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sem historico ainda</h2>
          <p className="text-sm text-gray-600 px-6">
            Conforme voce registrar transacoes, a evolucao aparece aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Card de tendencia */}
          {tendencia && tendencia.direcao !== 'sem_dados' && (
            <div
              className={`rounded-3xl p-4 mb-5 shadow-soft border-2 ${
                tendencia.direcao === 'subindo'
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                  : tendencia.direcao === 'descendo'
                  ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
                  : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl">
                  {tendencia.direcao === 'subindo' && '📈'}
                  {tendencia.direcao === 'descendo' && '📉'}
                  {tendencia.direcao === 'estavel' && '➡️'}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide opacity-70">
                    Tendencia do lucro
                  </div>
                  <div className="font-extrabold text-2xl text-gray-900">
                    {tendencia.lucroPct !== null && tendencia.lucroPct >= 0 ? '+' : ''}
                    {tendencia.lucroPct !== null ? `${tendencia.lucroPct}%` : '—'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                {tendencia.direcao === 'subindo' &&
                  'Seu lucro esta crescendo. Bom trabalho. Continua acompanhando pra manter.'}
                {tendencia.direcao === 'descendo' &&
                  'Seu lucro caiu. Olha as despesas e tenta entender o que mudou.'}
                {tendencia.direcao === 'estavel' &&
                  'Seu lucro esta estavel. Sem grandes oscilacoes — previsibilidade e bom sinal.'}
              </p>
              {(tendencia.receitaPct !== null || tendencia.despesaPct !== null) && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-current/10">
                  <div>
                    <div className="text-xs text-gray-500">Receita vs media</div>
                    <div className={`font-bold ${(tendencia.receitaPct ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {tendencia.receitaPct !== null
                        ? `${tendencia.receitaPct >= 0 ? '+' : ''}${tendencia.receitaPct}%`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Despesa vs media</div>
                    <div className={`font-bold ${(tendencia.despesaPct ?? 0) <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {tendencia.despesaPct !== null
                        ? `${tendencia.despesaPct >= 0 ? '+' : ''}${tendencia.despesaPct}%`
                        : '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grafico */}
          <div className="bg-white border-2 border-gray-100 rounded-3xl p-4 mb-5 shadow-soft">
            <div className="text-sm font-bold text-gray-900 mb-3">
              Receita vs Despesa vs Lucro
            </div>
            <div className="h-64 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={meses}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtCompact}
                  />
                  <Tooltip
                    formatter={(v: unknown, name: unknown) => [fmt(Number(v) || 0), String(name)]}
                    labelStyle={{ color: '#111827', fontWeight: 700 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Receita"
                  />
                  <Line
                    type="monotone"
                    dataKey="despesa"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Despesa"
                  />
                  <Line
                    type="monotone"
                    dataKey="lucro"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Lucro"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparacao mes atual vs anterior */}
          {mesAtual && mesAnterior && mesAnterior.txCount > 0 && (
            <div className="bg-white border-2 border-gray-100 rounded-3xl p-4 mb-5 shadow-soft">
              <div className="text-sm font-bold text-gray-900 mb-3">
                {mesAtual.label} vs {mesAnterior.label}
              </div>
              <div className="space-y-3">
                <ComparacaoRow
                  label="Receita"
                  atual={mesAtual.receita}
                  anterior={mesAnterior.receita}
                  positivoBom
                />
                <ComparacaoRow
                  label="Despesa"
                  atual={mesAtual.despesa}
                  anterior={mesAnterior.despesa}
                  positivoBom={false}
                />
                <ComparacaoRow
                  label="Lucro"
                  atual={mesAtual.lucro}
                  anterior={mesAnterior.lucro}
                  positivoBom
                  destacado
                />
              </div>
            </div>
          )}

          {/* Highlights */}
          {maiorReceita.receita > 0 && (
            <div className="bg-white border-2 border-gray-100 rounded-3xl p-4 mb-5 shadow-soft">
              <div className="text-sm font-bold text-gray-900 mb-3">🏆 Destaques do periodo</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-500">Maior receita</div>
                    <div className="font-bold text-gray-900">{maiorReceita.label}</div>
                  </div>
                  <div className="font-bold text-green-600">{fmt(maiorReceita.receita)}</div>
                </div>
                {maiorLucro.lucro > 0 && (
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500">Melhor mes (lucro)</div>
                      <div className="font-bold text-gray-900">{maiorLucro.label}</div>
                    </div>
                    <div className="font-bold text-purple-600">{fmt(maiorLucro.lucro)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center leading-relaxed mt-3">
            Lucro = receita − despesa − pro-labore + reembolsos.
            <br />
            Retiradas, investimentos e gastos pessoais nao entram no calculo.
          </p>
        </>
      )}
    </main>
  );
}

function ComparacaoRow({
  label,
  atual,
  anterior,
  positivoBom,
  destacado,
}: {
  label: string;
  atual: number;
  anterior: number;
  positivoBom: boolean;
  destacado?: boolean;
}) {
  const diff = atual - anterior;
  const pct = anterior === 0 ? null : Math.round((diff / Math.abs(anterior)) * 100);
  const subiu = diff >= 0;
  const bom = positivoBom ? subiu : !subiu;

  return (
    <div className={`flex justify-between items-center ${destacado ? 'pt-3 border-t border-gray-100' : ''}`}>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`font-bold ${destacado ? 'text-lg text-gray-900' : 'text-gray-900'}`}>
          {fmt(atual)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-400">de {fmt(anterior)}</div>
        {pct !== null && (
          <div className={`text-sm font-bold ${bom ? 'text-green-600' : 'text-red-600'}`}>
            {subiu ? '↑' : '↓'} {Math.abs(pct)}%
          </div>
        )}
      </div>
    </div>
  );
}
