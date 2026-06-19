'use client';

import { useEffect, useState } from 'react';
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
  hasAttachment: boolean;
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

  const [hasAttachment, setHasAttachment] = useState(tx.hasAttachment);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Carrega URL assinada quando tem comprovante (server retorna pra cada visita).
  useEffect(() => {
    if (!hasAttachment) {
      setAttachmentUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/transactions/${tx.id}/attachment`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAttachmentUrl(data.url ?? null);
      } catch {
        // ignora — usuaria ainda ve o card "comprovante anexado"
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAttachment, tx.id]);

  async function uploadAttachment(file: File) {
    setAttachmentError(null);
    setAttachmentLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/transactions/${tx.id}/attachment`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAttachmentError(data.error ?? 'Falha ao enviar comprovante.');
        return;
      }
      setHasAttachment(true);
      setAttachmentUrl(data.url ?? null);
    } catch {
      setAttachmentError('Falha de rede. Tente de novo.');
    } finally {
      setAttachmentLoading(false);
    }
  }

  async function removerAttachment() {
    if (!confirm('Remover o comprovante?')) return;
    setAttachmentLoading(true);
    setAttachmentError(null);
    try {
      const res = await fetch(`/api/transactions/${tx.id}/attachment`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAttachmentError(data.error ?? 'Falha ao remover.');
        return;
      }
      setHasAttachment(false);
      setAttachmentUrl(null);
    } catch {
      setAttachmentError('Falha de rede. Tente de novo.');
    } finally {
      setAttachmentLoading(false);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    uploadAttachment(file);
  }

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

        {/* Comprovante (foto ou PDF) */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-gray-800">📎 Comprovante</div>
              <div className="text-xs text-gray-500">
                Foto ou PDF (max 8MB). Util pra dedutiveis.
              </div>
            </div>
            {hasAttachment && !attachmentLoading && (
              <button
                type="button"
                onClick={removerAttachment}
                className="text-xs text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
              >
                Remover
              </button>
            )}
          </div>

          {hasAttachment && attachmentUrl && (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl overflow-hidden border border-gray-100 mb-3 hover:opacity-90 transition"
            >
              {/\.(pdf)$/i.test(attachmentUrl.split('?')[0] ?? '') ? (
                <div className="bg-gray-50 p-6 text-center">
                  <div className="text-3xl mb-1">📄</div>
                  <div className="text-sm font-medium text-gray-700">Ver PDF</div>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachmentUrl}
                  alt="Comprovante"
                  className="w-full max-h-64 object-contain bg-gray-50"
                />
              )}
            </a>
          )}

          {hasAttachment && !attachmentUrl && !attachmentLoading && (
            <div className="text-xs text-gray-500 mb-3">
              Comprovante anexado. Carregando preview...
            </div>
          )}

          <label
            className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-3 cursor-pointer transition ${
              attachmentLoading
                ? 'border-gray-200 text-gray-400 cursor-wait'
                : 'border-gray-300 text-gray-700 hover:border-secondary-400 hover:bg-secondary-50'
            }`}
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={onPickFile}
              disabled={attachmentLoading}
              className="hidden"
            />
            <span className="font-medium text-sm">
              {attachmentLoading
                ? '⏳ Enviando...'
                : hasAttachment
                  ? '🔄 Trocar comprovante'
                  : '📷 Tirar foto ou anexar'}
            </span>
          </label>

          {attachmentError && (
            <div className="mt-2 text-xs text-red-600">{attachmentError}</div>
          )}
        </div>
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
