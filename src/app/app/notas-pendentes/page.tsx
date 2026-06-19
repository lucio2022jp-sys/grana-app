'use client';

/**
 * Fila de receitas que ainda nao tem nota fiscal emitida.
 *
 * Tres acoes por linha:
 * 1. "Emitir agora" — copia dados pro clipboard num formato pronto
 *    pra colar no Emissor Nacional NFS-e e abre o site em outra aba.
 * 2. "Ja emiti" — pede o numero da NF e marca a transacao como
 *    notaNumero=X (some da lista).
 * 3. Toque no card — leva pra tela de edicao da transacao.
 *
 * Por que copiar dados em vez de integrar direto: o Emissor Nacional
 * exige login gov.br e nao tem API publica pra MEI. Copiar/colar e
 * o melhor jeito gratuito pra reduzir o atrito.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Pendente = {
  id: string;
  date: string;
  amount: number;
  description: string;
  contraparte: string | null;
  contraparteDoc: string | null;
  category: string;
  notes: string | null;
};

const EMISSOR_NACIONAL_URL = 'https://www.nfse.gov.br';

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function diasAtras(s: string) {
  const d = new Date(s);
  const hoje = new Date();
  return Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function NotasPendentesPage() {
  const router = useRouter();
  const [data, setData] = useState<{
    pendentes: Pendente[];
    total: number;
    count: number;
    atrasadas: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch('/api/notas-pendentes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setData(j);
    } catch (e: any) {
      setErro(e?.message ?? 'erro');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function emitirAgora(p: Pendente) {
    // Monta um bloco com os dados que o Emissor Nacional pede,
    // num formato facil de identificar e colar.
    const dados = [
      `Cliente: ${p.contraparte ?? '(preencher)'}`,
      p.contraparteDoc ? `CPF/CNPJ: ${p.contraparteDoc}` : null,
      `Valor: ${brl(p.amount)}`,
      `Data do servico: ${new Date(p.date).toLocaleDateString('pt-BR')}`,
      `Descricao: ${p.description}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(dados);
      setCopiado(p.id);
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      // sem clipboard, segue baile sem copia
    }

    window.open(EMISSOR_NACIONAL_URL, '_blank', 'noopener');
  }

  async function marcarEmitida(p: Pendente) {
    const numero = window.prompt(
      `Qual o numero da NF emitida pra "${p.contraparte ?? p.description}" (${brl(p.amount)})?`,
    );
    if (!numero || !numero.trim()) return;

    setMarcando(p.id);
    try {
      const res = await fetch(`/api/transactions/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaNumero: numero.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e: any) {
      alert('Nao consegui marcar: ' + (e?.message ?? 'erro'));
    }
    setMarcando(null);
  }

  return (
    <main className="flex-1 p-5">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">📋 Notas pendentes</h1>
        <p className="text-sm text-gray-500">
          Receitas dos ultimos 90 dias que ainda nao tem NF emitida.
        </p>
      </div>

      {loading && <div className="text-gray-400">Carregando...</div>}

      {!loading && erro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
          {erro}
        </div>
      )}

      {!loading && data && data.count === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Tudo em dia
          </h2>
          <p className="text-sm text-gray-600 px-6">
            Nenhuma receita sem NF nos ultimos 90 dias.
          </p>
        </div>
      )}

      {!loading && data && data.count > 0 && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
              <div className="text-xs text-amber-700 font-semibold">Pendentes</div>
              <div className="text-lg font-extrabold text-amber-900">{data.count}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
              <div className="text-xs text-emerald-700 font-semibold">Total</div>
              <div className="text-lg font-extrabold text-emerald-900">{brl(data.total)}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
              <div className="text-xs text-red-700 font-semibold">{'>'} 7 dias</div>
              <div className="text-lg font-extrabold text-red-900">{data.atrasadas}</div>
            </div>
          </div>

          {/* Card de ajuda do Emissor Nacional */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 text-xs text-blue-900 leading-relaxed">
            <div className="font-bold mb-1">💡 Como funciona</div>
            Toca em <span className="font-semibold">"Emitir agora"</span> e o app
            copia os dados da receita pro seu clipboard e abre o Emissor Nacional
            (nfse.gov.br). Voce loga com gov.br, cola os campos e emite. Depois
            volta aqui e clica em <span className="font-semibold">"Ja emiti"</span> pra registrar
            o numero.
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {data.pendentes.map((p) => {
              const dias = diasAtras(p.date);
              const atrasada = dias > 7;
              return (
                <div
                  key={p.id}
                  className={`bg-white border-2 rounded-2xl p-4 transition ${
                    atrasada ? 'border-red-200' : 'border-gray-100'
                  }`}
                >
                  <Link href={`/app/transacao/${p.id}`} className="block mb-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate">
                          {p.contraparte ?? p.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {formatDate(p.date)} · {dias === 0 ? 'hoje' : `${dias}d atras`}
                          {atrasada && (
                            <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                              atrasada
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="font-extrabold text-green-600 whitespace-nowrap">
                        {brl(p.amount)}
                      </div>
                    </div>
                  </Link>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => emitirAgora(p)}
                      className="bg-gradient-cool text-white font-bold py-2.5 rounded-xl text-xs shadow-glow-cool transition active:scale-95"
                    >
                      {copiado === p.id ? '✓ Copiado!' : '🚀 Emitir agora'}
                    </button>
                    <button
                      onClick={() => marcarEmitida(p)}
                      disabled={marcando === p.id}
                      className="bg-white border-2 border-gray-300 hover:border-emerald-400 text-gray-800 font-semibold py-2.5 rounded-xl text-xs transition active:scale-95 disabled:opacity-50"
                    >
                      {marcando === p.id ? '...' : '✅ Ja emiti'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
