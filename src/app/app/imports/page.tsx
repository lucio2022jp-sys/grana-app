'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Import = {
  id: string;
  fileName: string;
  fileSize: number;
  bankDetected: string | null;
  formato: string;
  status: string;
  errorMsg: string | null;
  txCount: number;
  createdAt: string;
};

type Stats = {
  totalImports: number;
  totalTransacoes: number;
  ultimoImport: string | null;
  importesMesCount: number;
};

const BANK_LABEL: Record<string, { nome: string; emoji: string }> = {
  nubank: { nome: 'Nubank', emoji: '💜' },
  inter: { nome: 'Inter', emoji: '🟧' },
  itau: { nome: 'Itau', emoji: '🟧' },
  bb: { nome: 'Banco do Brasil', emoji: '🟨' },
  caixa: { nome: 'Caixa', emoji: '🟦' },
  bradesco: { nome: 'Bradesco', emoji: '🔴' },
  santander: { nome: 'Santander', emoji: '❤️' },
  btg: { nome: 'BTG', emoji: '⚫' },
  c6: { nome: 'C6', emoji: '⬛' },
  generico: { nome: 'Outro', emoji: '🏦' },
};

const FORMATO_INFO: Record<string, { emoji: string; cor: string }> = {
  pdf: { emoji: '📄', cor: 'bg-red-100 text-red-700' },
  ofx: { emoji: '📊', cor: 'bg-green-100 text-green-700' },
  csv: { emoji: '📑', cor: 'bg-blue-100 text-blue-700' },
};

const STATUS_INFO: Record<string, { label: string; cor: string }> = {
  done: { label: 'Concluido', cor: 'bg-green-100 text-green-700' },
  processing: { label: 'Processando', cor: 'bg-yellow-100 text-yellow-700' },
  error: { label: 'Erro', cor: 'bg-red-100 text-red-700' },
};

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatarData(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatarHora(s: string): string {
  return new Date(s).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ImportsPage() {
  const router = useRouter();
  const [imports, setImports] = useState<Import[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/imports');
    const d = await res.json();
    setImports(d.imports);
    setStats(d.stats);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function apagar(id: string) {
    if (!confirm('Apagar esse import e TODAS as transacoes ligadas a ele?\n\nIsso nao tem volta.')) return;
    setDeleting(id);
    await fetch(`/api/imports/${id}`, { method: 'DELETE' });
    setDeleting(null);
    await load();
  }

  if (loading) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Carregando...</div>
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

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">📚 Imports</h1>
        <p className="text-sm text-gray-500">
          Historico dos extratos que voce ja processou.
        </p>
      </div>

      {/* Stats */}
      {stats && stats.totalImports > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-soft">
            <div className="text-xs text-gray-500 font-semibold">Esse mes</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">
              {stats.importesMesCount}
            </div>
            <div className="text-xs text-gray-500">imports</div>
          </div>
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-soft">
            <div className="text-xs text-gray-500 font-semibold">Total</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">
              {stats.totalTransacoes}
            </div>
            <div className="text-xs text-gray-500">transacoes</div>
          </div>
        </div>
      )}

      {/* Vazio */}
      {imports.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 animate-float">📥</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Nenhum import ainda
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Importe seu primeiro extrato pra comecar.
          </p>
          <Link
            href="/onboarding/upload"
            className="inline-block bg-gradient-cool text-white font-bold py-4 px-8 rounded-3xl shadow-glow-cool"
          >
            Importar extrato
          </Link>
        </div>
      )}

      {/* Lista */}
      {imports.length > 0 && (
        <div className="space-y-3">
          {imports.map((imp) => {
            const bank = BANK_LABEL[imp.bankDetected ?? 'generico'] ?? BANK_LABEL.generico;
            const fmt = FORMATO_INFO[imp.formato] ?? FORMATO_INFO.pdf;
            const st = STATUS_INFO[imp.status] ?? STATUS_INFO.done;

            return (
              <div
                key={imp.id}
                className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0">{bank.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="font-bold text-gray-900">{bank.nome}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {formatarData(imp.createdAt)} · {formatarHora(imp.createdAt)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fmt.cor}`}>
                        {fmt.emoji} {imp.formato.toUpperCase()}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cor}`}>
                        {st.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatarTamanho(imp.fileSize)}
                      </span>
                    </div>

                    {imp.status === 'done' && (
                      <div className="text-sm text-gray-700">
                        ✓ {imp.txCount} {imp.txCount === 1 ? 'transacao' : 'transacoes'} salvas
                      </div>
                    )}

                    {imp.status === 'error' && imp.errorMsg && (
                      <div className="text-xs text-red-600 mt-1 bg-red-50 rounded-lg px-2 py-1">
                        ⚠️ {imp.errorMsg}
                      </div>
                    )}

                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {imp.fileName}
                    </div>

                    <button
                      onClick={() => apagar(imp.id)}
                      disabled={deleting === imp.id}
                      className="text-xs text-red-600 mt-2 hover:underline disabled:opacity-50"
                    >
                      {deleting === imp.id ? 'Apagando...' : '🗑️ Apagar import + transacoes'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {imports.length > 0 && (
        <Link
          href="/onboarding/upload"
          className="block bg-gradient-cool text-white font-bold py-4 rounded-3xl text-center shadow-glow-cool mt-6"
        >
          📎 Importar mais um
        </Link>
      )}
    </main>
  );
}
