'use client';

import { useEffect, useState } from 'react';

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Relatorio = {
  user: {
    name: string | null;
    profissao: string | null;
    regime: string | null;
    meiAtividade: string | null;
    simplesAnexo: string | null;
    contadorNome: string | null;
  };
  period: { year: number; month: number; monthName: string };
  mesesDisponiveis: string[];
  totals: {
    receita: number;
    despesa: number;
    pessoal: number;
    retirada: number;
    prolabore: number;
    lucroLiquido: number;
  };
  counts: {
    total: number;
    receitas: number;
    despesas: number;
    pessoais: number;
    retiradas: number;
  };
  receitas: Array<{ date: string; amount: number; description: string; contraparte: string | null }>;
  despesas: Array<{ date: string; amount: number; description: string; contraparte: string | null; category: string; isDeductible: boolean }>;
  retiradas: Array<{ date: string; amount: number; description: string; contraparte: string | null }>;
  topClientes: Array<{ nome: string; total: number; count: number }>;
  despesasPorCategoria: Array<{ categoria: string; total: number; count: number }>;
  mei: { yearReceita: number; meiPercent: number; limite: number };
  das: {
    pagoNoMes: { value: number; paidAt: string; month: number; year: number } | null;
    proximo: { value: number; dueDate: string; month: number; year: number } | null;
  };
  geradoEm: string;
};

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export default function RelatorioPublicoPage({
  params,
}: {
  params: { userId: string };
}) {
  const { userId } = params;
  const [data, setData] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mesAtual, setMesAtual] = useState<string | null>(null);

  async function load(month?: string) {
    setLoading(true);
    setError(null);
    try {
      const url = month
        ? `/api/relatorio-publico/${userId}?month=${month}`
        : `/api/relatorio-publico/${userId}`;
      const r = await fetch(url);
      if (!r.ok) {
        const j = await r.json();
        setError(j.error || 'Erro ao carregar');
        return;
      }
      const json = await r.json();
      setData(json);
      setMesAtual(`${json.period.year}-${String(json.period.month).padStart(2, '0')}`);
    } catch (e: any) {
      setError(e.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Carregando relatorio...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-md">
          <p className="text-2xl mb-3">📭</p>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Relatorio nao disponivel</h1>
          <p className="text-sm text-gray-600">{error || 'Cliente nao encontrado'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cabecalho */}
      <header className="bg-white border-b border-gray-200 print:border-b-2 print:border-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Relatorio mensal compartilhado
              </p>
              <h1 className="text-2xl font-bold text-gray-900">{data.user.name || 'Cliente'}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {data.user.profissao && <span className="capitalize">{data.user.profissao}</span>}
                {data.user.regime && (
                  <>
                    {' · '}
                    {data.user.regime === 'mei' && 'MEI'}
                    {data.user.regime === 'simples' && `Simples Nacional${data.user.simplesAnexo ? ` - Anexo ${data.user.simplesAnexo}` : ''}`}
                    {data.user.regime === 'pf' && 'Pessoa Fisica'}
                  </>
                )}
              </p>
              {data.user.meiAtividade && (
                <p className="text-xs text-gray-500 mt-1">{data.user.meiAtividade}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-gray-500">Periodo</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {data.period.monthName} {data.period.year}
              </p>
              {data.mesesDisponiveis.length > 1 && (
                <select
                  value={mesAtual || ''}
                  onChange={(e) => load(e.target.value)}
                  className="mt-2 text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white print:hidden"
                >
                  {data.mesesDisponiveis.map((m) => {
                    const [yy, mm] = m.split('-');
                    return (
                      <option key={m} value={m}>
                        {MESES[Number(mm) - 1]} {yy}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition"
            >
              🖨️ Imprimir / salvar PDF
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Resumo */}
        <section className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Resumo do mes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card label="Receita" value={brl(data.totals.receita)} color="green" />
            <Card label="Despesa" value={brl(data.totals.despesa)} color="red" />
            <Card label="Pessoal" value={brl(data.totals.pessoal)} color="orange" />
            <Card
              label="Lucro liquido"
              value={brl(data.totals.lucroLiquido)}
              color={data.totals.lucroLiquido >= 0 ? 'blue' : 'red'}
            />
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {data.counts.total} transacoes ({data.counts.receitas} receitas, {data.counts.despesas} despesas, {data.counts.pessoais} pessoais)
          </p>
        </section>

        {/* DAS */}
        {(data.das.pagoNoMes || data.das.proximo) && (
          <section className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">DAS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.das.pagoNoMes && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs uppercase text-green-700 font-medium mb-1">Pago no mes</p>
                  <p className="text-xl font-bold text-green-900">{brl(data.das.pagoNoMes.value)}</p>
                  <p className="text-xs text-green-700 mt-1">
                    Em {formatDate(data.das.pagoNoMes.paidAt)}
                  </p>
                </div>
              )}
              {data.das.proximo && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs uppercase text-amber-700 font-medium mb-1">Proximo a vencer</p>
                  <p className="text-xl font-bold text-amber-900">{brl(data.das.proximo.value)}</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Vence em {formatDate(data.das.proximo.dueDate)}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Limite MEI */}
        {data.user.regime === 'mei' && (
          <section className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Limite MEI no ano</h2>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-gray-900">{brl(data.mei.yearReceita)}</span>
              <span className="text-sm text-gray-500">de {brl(data.mei.limite)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  data.mei.meiPercent >= 90
                    ? 'bg-red-500'
                    : data.mei.meiPercent >= 70
                    ? 'bg-amber-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${data.mei.meiPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {data.mei.meiPercent}% do limite anual usado
            </p>
          </section>
        )}

        {/* Top clientes */}
        {data.topClientes.length > 0 && (
          <section className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Top contrapartes (receitas)</h2>
            <div className="space-y-2">
              {data.topClientes.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700">{c.nome}</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">{brl(c.total)}</span>
                    <span className="text-xs text-gray-500 ml-2">({c.count}x)</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Despesas por categoria */}
        {data.despesasPorCategoria.length > 0 && (
          <section className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Despesas por categoria</h2>
            <div className="space-y-2">
              {data.despesasPorCategoria.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700 capitalize">{c.categoria}</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">{brl(c.total)}</span>
                    <span className="text-xs text-gray-500 ml-2">({c.count}x)</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabela de receitas */}
        {data.receitas.length > 0 && (
          <section className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Receitas ({data.receitas.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                  <tr>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Descricao</th>
                    <th className="py-2 pr-3">Contraparte</th>
                    <th className="py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.receitas.map((t, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="py-2 pr-3 text-gray-700">{t.description}</td>
                      <td className="py-2 pr-3 text-gray-600">{t.contraparte || '-'}</td>
                      <td className="py-2 text-right font-medium text-green-700 whitespace-nowrap">{brl(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td colSpan={3} className="py-2 pr-3 text-gray-900">Total</td>
                    <td className="py-2 text-right text-green-700">{brl(data.totals.receita)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Tabela de despesas */}
        {data.despesas.length > 0 && (
          <section className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Despesas ({data.despesas.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                  <tr>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Descricao</th>
                    <th className="py-2 pr-3">Categoria</th>
                    <th className="py-2 pr-3">Dedutivel</th>
                    <th className="py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.despesas.map((t, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="py-2 pr-3 text-gray-700">
                        {t.description}
                        {t.contraparte && <span className="text-gray-500"> · {t.contraparte}</span>}
                      </td>
                      <td className="py-2 pr-3 text-gray-600 capitalize">{t.category}</td>
                      <td className="py-2 pr-3 text-gray-500">{t.isDeductible ? 'Sim' : '-'}</td>
                      <td className="py-2 text-right font-medium text-red-700 whitespace-nowrap">{brl(Math.abs(t.amount))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td colSpan={4} className="py-2 pr-3 text-gray-900">Total</td>
                    <td className="py-2 text-right text-red-700">{brl(data.totals.despesa)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Retiradas */}
        {data.retiradas.length > 0 && (
          <section className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Retiradas pessoais ({data.retiradas.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                  <tr>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Descricao</th>
                    <th className="py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.retiradas.map((t, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="py-2 pr-3 text-gray-700">{t.description}</td>
                      <td className="py-2 text-right font-medium text-orange-700 whitespace-nowrap">{brl(Math.abs(t.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-gray-400 py-6">
          <p>Gerado pelo Grana em {new Date(data.geradoEm).toLocaleString('pt-BR')}</p>
          <p className="mt-1">grana-app.netlify.app</p>
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
          header { background: white !important; }
          section { break-inside: avoid; box-shadow: none !important; border: 1px solid #e5e7eb !important; }
        }
      `}</style>
    </main>
  );
}

function Card({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'green' | 'red' | 'orange' | 'blue';
}) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <p className="text-xs uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}
