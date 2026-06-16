'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Tx = {
  id: string;
  date: string;
  amount: number;
  description: string;
  contraparte: string | null;
  type: string;
  category: string;
  isDeductible: boolean;
  isPersonal: boolean;
  isRecurring?: boolean;
  userConfirmed: boolean;
  notes?: string | null;
};

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  });
}

const TYPES = [
  { value: 'todas', label: 'Todas', emoji: '🎯', cor: 'bg-secondary-500' },
  { value: 'receita', label: 'Receitas', emoji: '💰', cor: 'bg-green-500' },
  { value: 'despesa', label: 'Trabalho', emoji: '📉', cor: 'bg-orange-500' },
  { value: 'pessoal', label: 'Pessoal', emoji: '🛒', cor: 'bg-gray-700' },
];

const CATEGORIA_EMOJI: Record<string, string> = {
  produto: '🛒', equipamento: '🔧', marketing: '📣', transporte: '🚗',
  aluguel: '🏠', servicos: '🧾', curso: '📚', outros_trabalho: '💼',
  alimentacao: '🍔', lazer: '🎬', casa: '🏡', saude: '💊',
  transporte_pessoal: '🚕', familia: '👨‍👩‍👧', outros_pessoal: '🎈',
  cliente: '💰', outros: '📦',
  transferencia: '🔁', prolabore: '👔', retirada: '🏦',
  emprestimo: '🤝', investimento: '📈', reembolso: '↩️',
};

export default function TransacoesPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [filter, setFilter] = useState('todas');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = filter === 'todas' ? '/api/transactions' : `/api/transactions?type=${filter}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setTxs(d.transactions);
        setLoading(false);
      });
  }, [filter]);

  const grouped = txs.reduce<Record<string, Tx[]>>((acc, tx) => {
    const key = tx.date.slice(0, 10);
    (acc[key] = acc[key] ?? []).push(tx);
    return acc;
  }, {});

  return (
    <main className="flex-1 p-5">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Transacoes</h1>

      <div className="grid grid-cols-4 gap-2 mb-6">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`px-2 py-2.5 rounded-2xl text-xs font-semibold transition flex flex-col items-center gap-1 ${
              filter === t.value
                ? `${t.cor} text-white shadow-soft scale-105`
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <span className="text-lg leading-none">{t.emoji}</span>
            <span className="leading-none">{t.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2 animate-pulse">⏳</div>
          Carregando...
        </div>
      )}

      {!loading && txs.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-6xl mb-4">📭</div>
          <p className="font-medium">Nenhuma transacao por aqui ainda.</p>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-bold">
              {formatDate(date)}
            </div>
            <div className="space-y-2">
              {items.map((tx) => (
                <Link
                  key={tx.id}
                  href={`/app/transacao/${tx.id}`}
                  className="block bg-white border border-gray-100 rounded-2xl p-4 hover:border-secondary-300 hover:shadow-soft transition"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="text-3xl shrink-0">
                        {CATEGORIA_EMOJI[tx.category] ?? '📦'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate">
                          {tx.contraparte ?? tx.description}
                        </div>
                        <div className="text-xs text-gray-500 capitalize mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{tx.category.replace('_', ' ')}</span>
                          {tx.isRecurring && <span className="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-medium">🔁 recorrente</span>}
                          {tx.isDeductible && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">dedutivel</span>}
                          {!tx.userConfirmed && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">confirmar</span>}
                          {tx.notes && /ja categorizou|parecid|descricao parecida/i.test(tx.notes) && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium" title={tx.notes}>
                              🧠 aprendido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`font-extrabold whitespace-nowrap text-lg ${
                      tx.amount > 0 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{formatBRL(tx.amount)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
