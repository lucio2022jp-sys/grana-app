'use client';

/**
 * Detalhe de um cliente: dados, totais, historico de recibos, historico
 * de receitas (transactions) com nome/CPF batendo, e botao pra emitir
 * novo recibo direto pra ele.
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Cliente = {
  id: string;
  nome: string;
  doc: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  notes: string | null;
};

type Recibo = {
  id: string;
  numero: number;
  data: string;
  valor: number;
  descricao: string;
};

type Tx = {
  id: string;
  date: string;
  amount: number;
  description: string;
  notaNumero: string | null;
};

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(s: string) {
  return new Date(s).toLocaleDateString('pt-BR');
}

function formatDoc(d: string | null): string | null {
  if (!d) return null;
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d;
}

export default function ClienteDetalhePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [totals, setTotals] = useState<{
    recibos: number;
    transactions: number;
    countRecibos: number;
    countTxs: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes/${params.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setCliente(j.cliente);
      setRecibos(j.recibos ?? []);
      setTransactions(j.transactions ?? []);
      setTotals(j.totals);
    } catch (e: any) {
      setErro(e?.message ?? 'erro');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function deletar() {
    if (!confirm('Excluir esse cliente? Os recibos ja emitidos serao mantidos.')) return;
    try {
      const res = await fetch(`/api/clientes/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.push('/app/clientes');
    } catch (e: any) {
      alert('Erro: ' + (e?.message ?? 'desconhecido'));
    }
  }

  if (loading) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Carregando...</div>
      </main>
    );
  }

  if (erro || !cliente) {
    return (
      <main className="flex-1 p-5">
        <button
          onClick={() => router.back()}
          className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center"
        >
          ←
        </button>
        <div className="text-red-700">{erro ?? 'Cliente nao encontrado'}</div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-5">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      {/* Header com dados */}
      <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 mb-4">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-gray-900 break-words">
              {cliente.nome}
            </h1>
            {formatDoc(cliente.doc) && (
              <div className="text-sm text-gray-600 mt-1">
                {formatDoc(cliente.doc)}
              </div>
            )}
          </div>
          <button
            onClick={() => setEditando(true)}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full font-semibold"
          >
            ✏️ Editar
          </button>
        </div>

        <div className="space-y-1 text-sm text-gray-600 mb-3">
          {cliente.whatsapp && <div>📱 {cliente.whatsapp}</div>}
          {cliente.email && <div>📧 {cliente.email}</div>}
          {cliente.endereco && <div>📍 {cliente.endereco}</div>}
          {cliente.notes && (
            <div className="italic text-gray-500">📝 {cliente.notes}</div>
          )}
        </div>

        <Link
          href={`/app/recibo/novo?clienteId=${cliente.id}`}
          className="block bg-gradient-cool text-white text-center font-bold py-3 rounded-2xl shadow-glow-cool active:scale-95"
        >
          🧾 Novo recibo pra esse cliente
        </Link>
      </div>

      {/* Totais */}
      {totals && (totals.countRecibos > 0 || totals.countTxs > 0) && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
            <div className="text-xs text-emerald-700 font-semibold">Recibos</div>
            <div className="text-lg font-extrabold text-emerald-900">
              {brl(totals.recibos)}
            </div>
            <div className="text-xs text-emerald-700">{totals.countRecibos} doc</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-center">
            <div className="text-xs text-purple-700 font-semibold">Receitas</div>
            <div className="text-lg font-extrabold text-purple-900">
              {brl(totals.transactions)}
            </div>
            <div className="text-xs text-purple-700">
              {totals.countTxs} transacao{totals.countTxs === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      )}

      {/* Historico de recibos */}
      {recibos.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-2">🧾 Recibos emitidos</h2>
          <div className="space-y-2">
            {recibos.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-gray-100 rounded-xl p-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500">
                      No {String(r.numero).padStart(4, '0')} · {fmtData(r.data)}
                    </div>
                    <div className="text-sm text-gray-900 truncate">{r.descricao}</div>
                  </div>
                  <div className="font-bold text-emerald-700 whitespace-nowrap">
                    {brl(r.valor)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historico de receitas (transactions) */}
      {transactions.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-2">💰 Receitas no extrato</h2>
          <div className="space-y-2">
            {transactions.map((t) => (
              <Link
                key={t.id}
                href={`/app/transacao/${t.id}`}
                className="block bg-white border border-gray-100 hover:border-secondary-300 rounded-xl p-3 transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500">{fmtData(t.date)}</div>
                    <div className="text-sm text-gray-900 truncate">{t.description}</div>
                    {t.notaNumero ? (
                      <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-medium">
                        🧾 NF {t.notaNumero}
                      </span>
                    ) : (
                      <span className="inline-block mt-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
                        🧾 sem NF
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-green-600 whitespace-nowrap">
                    {brl(t.amount)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recibos.length === 0 && transactions.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center text-sm text-blue-800 mb-4">
          Sem historico ainda. Ao emitir o primeiro recibo, ele aparece aqui.
        </div>
      )}

      <button
        onClick={deletar}
        className="w-full text-red-600 text-sm py-3 mt-4"
      >
        Excluir cliente
      </button>

      {editando && (
        <EditarClienteModal
          cliente={cliente}
          onClose={() => setEditando(false)}
          onSaved={(c) => {
            setEditando(false);
            setCliente(c);
          }}
        />
      )}
    </main>
  );
}

function EditarClienteModal({
  cliente,
  onClose,
  onSaved,
}: {
  cliente: Cliente;
  onClose: () => void;
  onSaved: (c: Cliente) => void;
}) {
  const [nome, setNome] = useState(cliente.nome);
  const [doc, setDoc] = useState(cliente.doc ?? '');
  const [whatsapp, setWhatsapp] = useState(cliente.whatsapp ?? '');
  const [email, setEmail] = useState(cliente.email ?? '');
  const [endereco, setEndereco] = useState(cliente.endereco ?? '');
  const [notes, setNotes] = useState(cliente.notes ?? '');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, doc, whatsapp, email, endereco, notes,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'erro');
      onSaved(j.cliente);
    } catch (e: any) {
      alert('Erro: ' + (e?.message ?? 'desconhecido'));
    }
    setSalvando(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-xl font-extrabold text-gray-900 mb-4">Editar cliente</h2>

        <div className="space-y-3">
          {[
            { label: 'Nome', value: nome, set: setNome },
            { label: 'CPF/CNPJ', value: doc, set: setDoc },
            { label: 'WhatsApp', value: whatsapp, set: setWhatsapp },
            { label: 'Email', value: email, set: setEmail },
            { label: 'Endereco', value: endereco, set: setEndereco },
            { label: 'Observacoes', value: notes, set: setNotes },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs font-semibold text-gray-700">{f.label}</label>
              <input
                type="text"
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="w-full mt-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-secondary-400 outline-none"
              />
            </div>
          ))}
        </div>

        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-gradient-cool text-white font-bold py-4 rounded-2xl mt-5 active:scale-95 disabled:opacity-50"
        >
          {salvando ? '⏳ Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={onClose}
          className="w-full text-gray-500 py-3 mt-2 text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
