'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Group = {
  key: string;
  contraparte: string;
  valorMedio: number;
  type: string;
  category: string;
  occurrences: number;
  monthsActive: number;
  intervalMedio: number;
  ultimaData: string;
  proximaPrevista?: string;
  transactionIds: string[];
};

type Data = {
  groups: Group[];
  totals: { receita: number; despesa: number };
  count: number;
};

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TYPE_COLOR: Record<string, string> = {
  receita: 'green',
  despesa: 'orange',
  pessoal: 'gray',
  prolabore: 'indigo',
};

export default function RecorrentesPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState<'todos' | 'receita' | 'despesa'>('todos');

  async function load() {
    const res = await fetch('/api/recurring');
    const d = await res.json();
    setData(d);
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Carregando...</div>
      </main>
    );
  }

  const grupos = filter === 'todos'
    ? data.groups
    : data.groups.filter((g) => g.type === filter);

  return (
    <main className="flex-1 p-5">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">🔁 Recorrentes</h1>
        <p className="text-sm text-gray-500">
          Pagamentos e recebimentos que se repetem todo mes.
        </p>
      </div>

      {data.count === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Ainda nao detectei nada
          </h2>
          <p className="text-sm text-gray-600 px-6">
            Quando voce tiver pelo menos 2-3 meses de transacoes,
            o app comeca a identificar os padroes recorrentes.
          </p>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gradient-money text-white rounded-2xl p-4 shadow-glow-money">
              <div className="text-xs font-semibold opacity-90">Recebimentos/mes</div>
              <div className="text-xl font-extrabold mt-1">{formatBRL(data.totals.receita)}</div>
            </div>
            <div className="bg-gradient-warning text-white rounded-2xl p-4 shadow-glow-yellow">
              <div className="text-xs font-semibold opacity-90">Despesas/mes</div>
              <div className="text-xl font-extrabold mt-1">{formatBRL(data.totals.despesa)}</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {(['todos', 'receita', 'despesa'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`py-2 rounded-xl text-xs font-semibold transition capitalize ${
                  filter === t
                    ? 'bg-secondary-500 text-white shadow-soft scale-105'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                {t === 'todos' ? '🎯 Todos' : t === 'receita' ? '💰 Receitas' : '📉 Despesas'}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {grupos.map((g) => {
              const cor = TYPE_COLOR[g.type] ?? 'gray';
              return (
                <div
                  key={g.key}
                  className={`bg-white border-2 rounded-2xl p-4 shadow-soft border-${cor}-100`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 truncate">
                        {g.contraparte}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {g.occurrences} {g.occurrences === 1 ? 'vez' : 'vezes'} •
                        a cada {g.intervalMedio} dias
                      </div>
                      {g.proximaPrevista && (
                        <div className="text-xs text-secondary-600 font-medium mt-1">
                          Proxima: {new Date(g.proximaPrevista).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                    <div className={`text-right shrink-0 ${
                      g.type === 'receita' ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      <div className="font-extrabold">
                        {g.valorMedio > 0 ? '+' : ''}{formatBRL(g.valorMedio)}
                      </div>
                      <div className="text-xs text-gray-500">media</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            💡 Recorrentes sao detectados automatico depois de cada extrato importado.
          </p>
        </>
      )}
    </main>
  );
}
