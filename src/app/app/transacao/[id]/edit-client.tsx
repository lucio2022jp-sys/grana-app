'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  userConfirmed: boolean;
};

const ALL_CATEGORIES = [
  { value: 'cliente', label: 'Cliente', emoji: '💰' },
  { value: 'produto', label: 'Produto', emoji: '🛒' },
  { value: 'equipamento', label: 'Equipamento', emoji: '🔧' },
  { value: 'marketing', label: 'Marketing', emoji: '📣' },
  { value: 'transporte', label: 'Transporte', emoji: '🚗' },
  { value: 'aluguel', label: 'Aluguel', emoji: '🏠' },
  { value: 'servicos', label: 'Servicos', emoji: '🧾' },
  { value: 'curso', label: 'Curso', emoji: '📚' },
  { value: 'outros_trabalho', label: 'Outros (trabalho)', emoji: '💼' },
  { value: 'alimentacao', label: 'Alimentacao', emoji: '🍔' },
  { value: 'lazer', label: 'Lazer', emoji: '🎬' },
  { value: 'casa', label: 'Casa', emoji: '🏡' },
  { value: 'saude', label: 'Saude', emoji: '💊' },
  { value: 'transporte_pessoal', label: 'Transporte pessoal', emoji: '🚕' },
  { value: 'familia', label: 'Familia', emoji: '👨‍👩‍👧' },
  { value: 'outros_pessoal', label: 'Outros (pessoal)', emoji: '🎈' },
];

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function EditTxClient({ tx }: { tx: Tx }) {
  const router = useRouter();
  const [type, setType] = useState(tx.type);
  const [category, setCategory] = useState(tx.category);
  const [isDeductible, setIsDeductible] = useState(tx.isDeductible);
  const [isPersonal, setIsPersonal] = useState(tx.isPersonal);
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setSaving(true);
    await fetch(`/api/transactions/${tx.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, category, isDeductible, isPersonal }),
    });
    router.push('/app/transacoes');
  }

  async function deletar() {
    if (!confirm('Deletar essa transacao?')) return;
    await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
    router.push('/app/transacoes');
  }

  return (
    <main className="flex-1 p-5">
      <button onClick={() => router.back()} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition">
        ←
      </button>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Detalhes</h1>

      <div className={`rounded-3xl p-6 mb-6 shadow-soft ${
        tx.amount > 0 ? 'bg-gradient-money text-white shadow-glow-money' : 'bg-white border-2 border-gray-100'
      }`}>
        <div className={`text-4xl font-extrabold mb-2 ${tx.amount > 0 ? 'text-white' : 'text-gray-900'}`}>
          {tx.amount > 0 ? '+' : ''}{formatBRL(tx.amount)}
        </div>
        <div className={`font-semibold ${tx.amount > 0 ? 'text-green-50' : 'text-gray-700'}`}>
          {tx.contraparte ?? tx.description}
        </div>
        <div className={`text-sm mt-1 ${tx.amount > 0 ? 'text-green-100' : 'text-gray-500'}`}>
          {new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-2">Tipo</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 shadow-soft transition"
          >
            <option value="receita">💰 Receita</option>
            <option value="despesa">📉 Despesa (trabalho)</option>
            <option value="pessoal">🛒 Pessoal</option>
            <option value="transferencia">🔁 Transferencia</option>
            <option value="prolabore">👔 Pro-labore</option>
            <option value="retirada">🏦 Retirada</option>
            <option value="emprestimo">🤝 Emprestimo</option>
            <option value="investimento">📈 Investimento</option>
            <option value="reembolso">↩️ Reembolso</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-2">Categoria</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 shadow-soft transition"
          >
            {ALL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-soft cursor-pointer hover:border-green-400 transition">
          <input
            type="checkbox"
            checked={isDeductible}
            onChange={(e) => setIsDeductible(e.target.checked)}
            className="w-5 h-5 accent-green-500"
          />
          <div className="flex-1">
            <div className="font-semibold text-gray-800">💚 Despesa dedutivel</div>
            <div className="text-xs text-gray-500">Marca quando for gasto comprovado do trabalho</div>
          </div>
        </label>

        <label className="flex items-center gap-3 bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-soft cursor-pointer hover:border-gray-400 transition">
          <input
            type="checkbox"
            checked={isPersonal}
            onChange={(e) => setIsPersonal(e.target.checked)}
            className="w-5 h-5"
          />
          <div className="flex-1">
            <div className="font-semibold text-gray-800">🛒 Gasto pessoal</div>
            <div className="text-xs text-gray-500">Marca quando nao for do trabalho</div>
          </div>
        </label>
      </div>

      <button
        onClick={salvar}
        disabled={saving}
        className="w-full mt-6 bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50 text-lg"
      >
        {saving ? '⏳ Salvando...' : '✨ Salvar'}
      </button>

      <button
        onClick={deletar}
        className="w-full mt-3 text-red-600 py-3 text-sm font-medium hover:bg-red-50 rounded-xl transition"
      >
        🗑️ Deletar transacao
      </button>
    </main>
  );
}
