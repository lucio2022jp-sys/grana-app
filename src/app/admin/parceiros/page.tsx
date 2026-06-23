'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Parceiro = {
  id: string;
  nome: string;
  foto: string | null;
  especialidade: string | null;
  cidade: string | null;
  whatsapp: string | null;
  email: string | null;
  preco: string | null;
  bio: string | null;
  ativo: boolean;
  ordem: number;
  notaMedia: number | null;
  notaCount: number;
  _count: { indicacoes: number; avaliacoes: number };
};

const VAZIO: Partial<Parceiro> = {
  nome: '',
  foto: '',
  especialidade: '',
  cidade: '',
  whatsapp: '',
  email: '',
  preco: '',
  bio: '',
  ativo: true,
  ordem: 0,
};

export default function AdminParceirosPage() {
  const router = useRouter();
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Partial<Parceiro> | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/parceiros');
    if (res.status === 401) {
      router.push('/admin/login');
      return;
    }
    const d = await res.json();
    setParceiros(d.parceiros);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function salvar() {
    if (!editando || !editando.nome) return;
    setSalvando(true);
    const isEdit = !!editando.id;
    const url = isEdit ? `/api/admin/parceiros/${editando.id}` : '/api/admin/parceiros';
    const method = isEdit ? 'PATCH' : 'POST';

    const body: any = { ...editando };
    delete body.id;
    delete body._count;
    delete body.notaMedia;
    delete body.notaCount;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSalvando(false);
    if (res.ok) {
      setEditando(null);
      load();
    } else {
      alert('Erro ao salvar');
    }
  }

  async function deletar(id: string) {
    if (!confirm('Deletar esse parceiro? Avaliacoes e indicacoes ficam no historico.')) return;
    await fetch(`/api/admin/parceiros/${id}`, { method: 'DELETE' });
    load();
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  if (loading) {
    return <main className="p-5"><div className="text-gray-400">Carregando...</div></main>;
  }

  // Modal de edicao/criacao
  if (editando) {
    const e = editando;
    return (
      <main className="p-5 max-w-md mx-auto w-full">
        <button onClick={() => setEditando(null)} className="text-gray-500 mb-4 text-sm">
          ← Voltar
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
          {e.id ? 'Editar parceiro' : 'Novo parceiro'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {e.id ? `ID: ${e.id}` : 'Cadastre um contador parceiro pra aparecer pra MEIs.'}
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Nome *</span>
            <input
              type="text"
              value={e.nome ?? ''}
              onChange={(ev) => setEditando({ ...e, nome: ev.target.value })}
              className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm"
              placeholder="Joao Silva"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Foto (URL)</span>
            <input
              type="url"
              value={e.foto ?? ''}
              onChange={(ev) => setEditando({ ...e, foto: ev.target.value })}
              className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm"
              placeholder="https://..."
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Especialidade</span>
            <input
              type="text"
              value={e.especialidade ?? ''}
              onChange={(ev) => setEditando({ ...e, especialidade: ev.target.value })}
              className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm"
              placeholder="MEI / Servicos"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Cidade</span>
            <input
              type="text"
              value={e.cidade ?? ''}
              onChange={(ev) => setEditando({ ...e, cidade: ev.target.value })}
              className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm"
              placeholder="Sao Paulo"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">WhatsApp</span>
              <input
                type="tel"
                value={e.whatsapp ?? ''}
                onChange={(ev) => setEditando({ ...e, whatsapp: ev.target.value })}
                className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm"
                placeholder="(11) 99999-9999"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Email</span>
              <input
                type="email"
                value={e.email ?? ''}
                onChange={(ev) => setEditando({ ...e, email: ev.target.value })}
                className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm"
                placeholder="contador@ex.com"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Preco (texto livre)</span>
            <input
              type="text"
              value={e.preco ?? ''}
              onChange={(ev) => setEditando({ ...e, preco: ev.target.value })}
              className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm"
              placeholder="R$ 89/mes ou A consultar"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Bio (max 500 chars)</span>
            <textarea
              value={e.bio ?? ''}
              onChange={(ev) => setEditando({ ...e, bio: ev.target.value })}
              maxLength={500}
              rows={3}
              className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm"
              placeholder="Atende MEI ha 10 anos, especialista em servicos de beleza."
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Ordem (menor = aparece antes)</span>
              <input
                type="number"
                value={e.ordem ?? 0}
                onChange={(ev) => setEditando({ ...e, ordem: parseInt(ev.target.value, 10) || 0 })}
                className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 mt-5 bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={e.ativo ?? true}
                onChange={(ev) => setEditando({ ...e, ativo: ev.target.checked })}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium">Ativo</span>
            </label>
          </div>

          <button
            onClick={salvar}
            disabled={salvando || !e.nome}
            className="w-full bg-gradient-cool text-white font-bold py-4 rounded-2xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50 mt-3"
          >
            {salvando ? '⏳ Salvando...' : '💾 Salvar'}
          </button>

          {e.id && (
            <button
              onClick={() => deletar(e.id!)}
              className="w-full text-red-600 py-2 text-sm hover:bg-red-50 rounded-xl"
            >
              🗑️ Deletar parceiro
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="p-5 max-w-md mx-auto w-full">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">👨‍💼 Parceiros</h1>
          <p className="text-xs text-gray-500">{parceiros.length} cadastrado{parceiros.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/funil" className="text-xs text-purple-600 underline">Funil</Link>
          <Link href="/admin/metrics" className="text-xs text-purple-600 underline">Métricas</Link>
          <button onClick={logout} className="text-xs text-gray-500 underline">Sair</button>
        </div>
      </div>

      <button
        onClick={() => setEditando({ ...VAZIO })}
        className="w-full bg-gradient-cool text-white font-bold py-4 rounded-2xl shadow-glow-cool mb-5"
      >
        ➕ Novo parceiro
      </button>

      {parceiros.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-3">📭</div>
          Nenhum parceiro cadastrado.
        </div>
      )}

      <div className="space-y-3">
        {parceiros.map((p) => {
          const alerta = p.notaCount >= 5 && p.notaMedia !== null && p.notaMedia < 3.0;
          return (
            <div
              key={p.id}
              className={`bg-white border-2 rounded-2xl p-4 shadow-soft ${
                !p.ativo ? 'opacity-50 border-gray-200'
                : alerta ? 'border-red-300 bg-red-50/30'
                : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {p.foto ? (
                    <img src={p.foto} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-xl">👨‍💼</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 truncate">{p.nome}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {p.especialidade ?? 'Sem especialidade'}
                      {p.cidade && ` · ${p.cidade}`}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {!p.ativo && (
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                      INATIVO
                    </span>
                  )}
                  {alerta && (
                    <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-semibold">
                      ⚠️ NOTA BAIXA
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-xs text-gray-500 mb-3">
                <span>
                  {p.notaCount > 0
                    ? `⭐ ${(p.notaMedia ?? 0).toFixed(1)} (${p.notaCount} avaliacoes)`
                    : '🆕 Sem avaliacoes'}
                </span>
                <span>
                  {p._count.indicacoes} indicacoes · {p._count.avaliacoes} aval.
                </span>
              </div>

              <button
                onClick={() => setEditando(p)}
                className="w-full bg-white border border-gray-300 hover:border-secondary-400 text-gray-800 font-semibold py-2 rounded-xl text-sm transition"
              >
                ✏️ Editar
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
