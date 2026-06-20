'use client';

/**
 * Lista de clientes da MEI. Mostra:
 *  - Cards com totais por cliente (recibos, ultimo atendimento)
 *  - Botao + para cadastrar novo
 *  - Cada card abre /app/clientes/[id] com historico
 *  - Link "Novo recibo" pula direto pra emissao
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Cliente = {
  id: string;
  nome: string;
  doc: string | null;
  whatsapp: string | null;
  email: string | null;
  recibosCount: number;
  totalRecibos: number;
  ultimoAtendimento: string | null;
};

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDoc(d: string | null): string | null {
  if (!d) return null;
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d;
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/clientes');
      const j = await res.json();
      setClientes(j.clientes ?? []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtrados = busca
    ? clientes.filter((c) =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (c.doc ?? '').includes(busca.replace(/\D/g, '')),
      )
    : clientes;

  return (
    <main className="flex-1 p-5">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">👥 Clientes</h1>
          <p className="text-sm text-gray-500">
            Salve uma vez, use sempre nos recibos.
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-gradient-cool text-white font-bold px-4 py-2 rounded-2xl text-sm shadow-glow-cool active:scale-95"
        >
          + Novo
        </button>
      </div>

      {clientes.length > 0 && (
        <input
          type="text"
          placeholder="🔎 Buscar por nome ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm mb-4 focus:border-secondary-400 outline-none"
        />
      )}

      {loading && <div className="text-gray-400">Carregando...</div>}

      {!loading && clientes.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 animate-float">👋</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Nenhum cliente ainda
          </h2>
          <p className="text-sm text-gray-600 mb-6 px-6">
            Cadastre seus clientes recorrentes pra emitir recibos sem
            redigitar tudo toda vez.
          </p>
          <button
            onClick={() => setModalAberto(true)}
            className="bg-gradient-cool text-white font-bold py-4 px-8 rounded-3xl shadow-glow-cool"
          >
            + Cadastrar primeiro cliente
          </button>
        </div>
      )}

      {!loading && filtrados.length > 0 && (
        <div className="space-y-2">
          {filtrados.map((c) => (
            <Link
              key={c.id}
              href={`/app/clientes/${c.id}`}
              className="block bg-white border-2 border-gray-100 hover:border-secondary-300 rounded-2xl p-4 transition"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-900 truncate">{c.nome}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {formatDoc(c.doc) ?? c.whatsapp ?? c.email ?? 'sem documento'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {c.recibosCount > 0 ? (
                      <>
                        🧾 {c.recibosCount} recibo{c.recibosCount === 1 ? '' : 's'} ·{' '}
                        <span className="font-semibold text-emerald-700">
                          {brl(c.totalRecibos)}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">sem recibos ainda</span>
                    )}
                  </div>
                </div>
                <div className="text-2xl">→</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {modalAberto && (
        <NovoClienteModal
          onClose={() => setModalAberto(false)}
          onCreated={(c) => {
            setModalAberto(false);
            router.push(`/app/clientes/${c.id}`);
          }}
        />
      )}
    </main>
  );
}

function NovoClienteModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: { id: string }) => void;
}) {
  const [nome, setNome] = useState('');
  const [doc, setDoc] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) {
      setErro('Informe o nome');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          doc: doc.trim() || null,
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      onCreated(j.cliente);
    } catch (e: any) {
      setErro(e?.message ?? 'erro');
    }
    setSalvando(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

        <h2 className="text-xl font-extrabold text-gray-900 mb-4">
          Novo cliente
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">
              Nome *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Maria Silva"
              className="w-full mt-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-secondary-400 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">
              CPF ou CNPJ
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full mt-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-secondary-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">
              WhatsApp
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 91234-5678"
              className="w-full mt-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-secondary-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@exemplo.com"
              className="w-full mt-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-secondary-400 outline-none"
            />
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-2 text-xs text-red-700 mt-3">
            {erro}
          </div>
        )}

        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-gradient-cool text-white font-bold py-4 rounded-2xl mt-5 active:scale-95 disabled:opacity-50"
        >
          {salvando ? '⏳ Salvando...' : 'Salvar cliente'}
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
