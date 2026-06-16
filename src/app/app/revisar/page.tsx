'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  notes: string | null;
};

const TIPOS = [
  { value: 'receita', label: 'Receita', emoji: '💰', cor: 'bg-green-500' },
  { value: 'despesa', label: 'Trabalho', emoji: '📉', cor: 'bg-orange-500' },
  { value: 'pessoal', label: 'Pessoal', emoji: '🛒', cor: 'bg-gray-700' },
  { value: 'transferencia', label: 'Transfer', emoji: '🔁', cor: 'bg-blue-500' },
];

const TIPOS_AVANCADOS = [
  { value: 'prolabore', label: 'Pro-labore', emoji: '👔' },
  { value: 'retirada', label: 'Retirada', emoji: '🏦' },
  { value: 'emprestimo', label: 'Emprestimo', emoji: '🤝' },
  { value: 'investimento', label: 'Investiment', emoji: '📈' },
  { value: 'reembolso', label: 'Reembolso', emoji: '↩️' },
];

const CATEGORIAS_DESPESA = [
  'produto', 'equipamento', 'marketing', 'transporte',
  'aluguel', 'servicos', 'curso', 'outros_trabalho',
];

const CATEGORIAS_PESSOAL = [
  'alimentacao', 'lazer', 'casa', 'saude',
  'transporte_pessoal', 'familia', 'outros_pessoal',
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

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function RevisarPage() {
  const router = useRouter();
  const [pending, setPending] = useState<Tx[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAvancado, setShowAvancado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/transactions/pending');
    const d = await res.json();
    setPending(d.pending);
    setIdx(0);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const total = pending.length;
  const tx = pending[idx];

  async function confirmar(updates?: Partial<Tx>) {
    if (!tx) return;
    setSaving(true);
    if (updates) {
      await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } else {
      // Confirma como esta
      await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tx.type, category: tx.category }),
      });
    }
    setSaving(false);
    proximo();
  }

  async function deletar() {
    if (!tx) return;
    setSaving(true);
    await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
    setSaving(false);
    setPending((p) => p.filter((t) => t.id !== tx.id));
    // mantem idx no mesmo lugar (o proximo vira o atual)
    if (idx >= pending.length - 1) setIdx(Math.max(0, pending.length - 2));
  }

  function proximo() {
    if (idx < pending.length - 1) setIdx(idx + 1);
    else {
      // Acabou
      setPending((p) => p.filter((t) => t.id !== tx?.id));
      setIdx(0);
    }
  }

  async function confirmarTudo() {
    if (!confirm(`Confirmar todas as ${total} transacoes como estao?`)) return;
    setConfirmingAll(true);
    await fetch('/api/transactions/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setConfirmingAll(false);
    router.push('/app');
  }

  function trocarTipo(novoTipo: string) {
    if (!tx) return;
    let novaCategoria = tx.category;
    let novoIsDeductible = tx.isDeductible;
    let novoIsPersonal = tx.isPersonal;

    if (novoTipo === 'receita') {
      novaCategoria = 'cliente';
      novoIsDeductible = false;
      novoIsPersonal = false;
    } else if (novoTipo === 'despesa') {
      if (!CATEGORIAS_DESPESA.includes(novaCategoria)) novaCategoria = 'produto';
      novoIsDeductible = true;
      novoIsPersonal = false;
    } else if (novoTipo === 'pessoal') {
      if (!CATEGORIAS_PESSOAL.includes(novaCategoria)) novaCategoria = 'alimentacao';
      novoIsDeductible = false;
      novoIsPersonal = true;
    } else {
      novaCategoria = novoTipo;
      novoIsDeductible = false;
      novoIsPersonal = false;
    }

    setPending((p) =>
      p.map((t) =>
        t.id === tx.id
          ? { ...t, type: novoTipo, category: novaCategoria, isDeductible: novoIsDeductible, isPersonal: novoIsPersonal }
          : t,
      ),
    );
  }

  function trocarCategoria(nova: string) {
    if (!tx) return;
    setPending((p) =>
      p.map((t) => (t.id === tx.id ? { ...t, category: nova } : t)),
    );
  }

  if (loading) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Carregando...</div>
      </main>
    );
  }

  if (total === 0) {
    return (
      <main className="flex-1 p-5">
        <button onClick={() => router.back()} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition">
          ←
        </button>
        <div className="text-center mt-12">
          <div className="text-7xl mb-4 animate-float">🎉</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            Tudo revisado!
          </h1>
          <p className="text-gray-600 text-sm mb-8">
            Sem nada pendente. O app aprendeu seus padroes.
          </p>
          <Link
            href="/app"
            className="inline-block bg-gradient-cool text-white font-bold py-4 px-8 rounded-3xl shadow-glow-cool"
          >
            Voltar pra home
          </Link>
        </div>
      </main>
    );
  }

  if (!tx) return null;

  const categorias =
    tx.type === 'despesa' ? CATEGORIAS_DESPESA :
    tx.type === 'pessoal' ? CATEGORIAS_PESSOAL :
    tx.type === 'receita' ? ['cliente'] :
    [tx.type];

  return (
    <main className="flex-1 p-5">
      <button onClick={() => router.back()} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition">
        ←
      </button>

      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Revisar</h1>
          <p className="text-sm text-gray-500">
            {idx + 1} de {total} pendentes
          </p>
        </div>
        <button
          onClick={confirmarTudo}
          disabled={confirmingAll}
          className="text-xs text-secondary-600 underline disabled:opacity-50"
        >
          {confirmingAll ? 'Confirmando...' : 'Confirmar tudo'}
        </button>
      </div>

      {/* Progresso */}
      <div className="bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="h-1.5 bg-gradient-cool transition-all"
          style={{ width: `${((idx) / total) * 100}%` }}
        />
      </div>

      {/* Card da transacao */}
      <div
        key={tx.id}
        className="bg-white border-2 border-gray-200 rounded-3xl p-5 mb-4 shadow-soft animate-pop-in"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="text-xs text-gray-500">
            {new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          </div>
          {tx.notes && (
            <div className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              💡 {tx.notes.slice(0, 30)}{tx.notes.length > 30 ? '...' : ''}
            </div>
          )}
        </div>

        <div className={`text-3xl font-extrabold mb-1 ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
          {tx.amount > 0 ? '+' : ''}{formatBRL(tx.amount)}
        </div>
        <div className="font-semibold text-gray-900 mb-1">
          {tx.contraparte ?? tx.description}
        </div>
        {tx.contraparte && tx.description !== tx.contraparte && (
          <div className="text-xs text-gray-500 truncate">{tx.description}</div>
        )}
      </div>

      {/* Tipo */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">Tipo</div>
        <div className="grid grid-cols-4 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              onClick={() => trocarTipo(t.value)}
              className={`py-2.5 rounded-xl text-xs font-semibold transition flex flex-col items-center gap-0.5 ${
                tx.type === t.value
                  ? `${t.cor} text-white shadow-soft scale-105`
                  : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              <span className="text-lg leading-none">{t.emoji}</span>
              <span className="leading-none">{t.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAvancado((s) => !s)}
          className="text-xs text-secondary-600 underline mt-2"
        >
          {showAvancado ? 'Ocultar' : '+ Outros tipos'}
        </button>

        {showAvancado && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {TIPOS_AVANCADOS.map((t) => (
              <button
                key={t.value}
                onClick={() => trocarTipo(t.value)}
                className={`py-2 rounded-xl text-xs font-semibold transition flex flex-col items-center gap-0.5 ${
                  tx.type === t.value
                    ? 'bg-secondary-500 text-white shadow-soft scale-105'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                <span className="text-base">{t.emoji}</span>
                <span className="leading-none">{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categoria - so pra despesa/pessoal */}
      {(tx.type === 'despesa' || tx.type === 'pessoal') && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">Categoria</div>
          <div className="grid grid-cols-2 gap-2">
            {categorias.map((c) => (
              <button
                key={c}
                onClick={() => trocarCategoria(c)}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition flex items-center gap-2 ${
                  tx.category === c
                    ? 'bg-secondary-100 border-2 border-secondary-500 text-secondary-700'
                    : 'bg-white border-2 border-gray-200 text-gray-700'
                }`}
              >
                <span>{CATEGORIA_EMOJI[c] ?? '📦'}</span>
                <span className="capitalize truncate">{c.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Acoes */}
      <div className="space-y-2">
        <button
          onClick={() => confirmar()}
          disabled={saving}
          className="w-full bg-gradient-money text-white font-bold py-4 rounded-2xl shadow-glow-money transition hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : '✓ Confirmar'}
        </button>

        <Link
          href={`/app/transacao/${tx.id}`}
          className="block w-full bg-white border-2 border-gray-300 text-gray-800 font-semibold py-3 rounded-2xl text-center hover:scale-105 active:scale-95 transition"
        >
          ✏️ Editar mais detalhes
        </Link>

        <button
          onClick={deletar}
          disabled={saving}
          className="w-full text-red-600 py-2 text-sm font-medium hover:bg-red-50 rounded-xl transition"
        >
          🗑️ Apagar essa transacao
        </button>

        <button
          onClick={proximo}
          className="w-full text-gray-500 py-2 text-sm"
        >
          Pular →
        </button>
      </div>
    </main>
  );
}
