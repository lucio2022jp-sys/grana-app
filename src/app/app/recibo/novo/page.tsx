'use client';

/**
 * Tela de novo recibo. Fluxo:
 *  1. Escolhe cliente (do select OU "novo cliente rapido")
 *  2. Preenche valor + descricao (sugere descricao do ultimo recibo do cliente)
 *  3. Toca "Gerar e enviar"
 *  4. App:
 *     - registra no banco (numero sequencial)
 *     - gera PDF no client (jsPDF)
 *     - tenta navigator.share com o file (mobile)
 *     - fallback: baixa PDF + abre wa.me com mensagem pronta
 *
 * Aceita ?clienteId=XXX na URL pra pre-selecionar (vindo do detalhe do cliente).
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Cliente = {
  id: string;
  nome: string;
  doc: string | null;
  whatsapp: string | null;
  email: string | null;
};

type User = {
  id: string;
  name: string | null;
  profissao: string | null;
};

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizeWhatsapp(raw: string): string {
  let n = raw.replace(/\D/g, '');
  if (!n.startsWith('55') && n.length >= 10) n = '55' + n;
  return n;
}

function NovoReciboInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preClienteId = searchParams.get('clienteId');

  const [user, setUser] = useState<User | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>(preClienteId ?? '');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Carrega user + lista de clientes
  useEffect(() => {
    Promise.all([
      fetch('/api/me').then((r) => r.json()),
      fetch('/api/clientes').then((r) => r.json()),
    ]).then(([userRes, clientesRes]) => {
      setUser(userRes.user);
      setClientes(clientesRes.clientes ?? []);
      setCarregando(false);
    });
  }, []);

  // Sugere descricao do ultimo recibo do cliente selecionado
  useEffect(() => {
    if (!clienteId) return;
    fetch(`/api/clientes/${clienteId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.recibos?.[0]?.descricao && !descricao) {
          setDescricao(j.recibos[0].descricao);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function gerarEEnviar() {
    setErro(null);
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!clienteId) {
      setErro('Escolha um cliente');
      return;
    }
    if (!valorNum || valorNum <= 0) {
      setErro('Valor invalido');
      return;
    }
    if (!descricao.trim()) {
      setErro('Descreva o servico ou produto');
      return;
    }

    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) {
      setErro('Cliente nao encontrado');
      return;
    }

    setEnviando(true);
    try {
      // 1. Persiste no banco
      const res = await fetch('/api/recibos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          valor: valorNum,
          descricao: descricao.trim(),
          data: new Date(data + 'T12:00:00').toISOString(),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'erro');
      const recibo = j.recibo;

      // 2. Gera PDF no client
      const { gerarReciboPDF } = await import('@/lib/recibo-pdf');
      const pdfDoc = gerarReciboPDF({
        numero: recibo.numero,
        data: recibo.data,
        valor: recibo.valor,
        descricao: recibo.descricao,
        emissor: {
          nome: user?.name ?? 'MEI',
          profissao: user?.profissao ?? null,
        },
        cliente: {
          nome: cliente.nome,
          doc: cliente.doc,
          contato: cliente.whatsapp ?? cliente.email ?? null,
        },
      });

      const fileName = `recibo-${String(recibo.numero).padStart(4, '0')}-${cliente.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      const blob = pdfDoc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // 3. Mensagem pra WhatsApp
      const msg = `Oi ${cliente.nome.split(' ')[0]}! Segue o recibo do servico de ${descricao.toLowerCase()} (${brl(valorNum)}). Obrigado(a)!`;

      // 4. Tenta share nativo (mobile)
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: `Recibo no ${recibo.numero}`,
            text: msg,
          });
          // Sucesso, redireciona
          router.push(`/app/clientes/${clienteId}`);
          return;
        } catch (e: any) {
          // user cancelou, segue pro fallback
          if (e?.name !== 'AbortError') {
            console.error('share falhou:', e);
          }
        }
      }

      // 5. Fallback: baixa o PDF e abre WhatsApp do cliente (se tiver)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      if (cliente.whatsapp) {
        const numero = normalizeWhatsapp(cliente.whatsapp);
        const msgUrl = encodeURIComponent(
          `${msg}\n\n(O recibo em PDF foi baixado no celular - anexa nesta conversa)`,
        );
        setTimeout(() => {
          window.open(`https://wa.me/${numero}?text=${msgUrl}`, '_blank');
        }, 500);
      } else {
        alert('PDF baixado. Anexe na sua conversa com o cliente.');
      }

      router.push(`/app/clientes/${clienteId}`);
    } catch (e: any) {
      setErro(e?.message ?? 'erro');
    }
    setEnviando(false);
  }

  if (carregando) {
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

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">🧾 Novo recibo</h1>
        <p className="text-sm text-gray-500">
          Recibo de pagamento (NAO substitui nota fiscal).
        </p>
      </div>

      {clientes.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
          <div className="text-3xl mb-2">👋</div>
          <div className="font-bold text-yellow-900 mb-2">Cadastre um cliente primeiro</div>
          <Link
            href="/app/clientes"
            className="inline-block bg-yellow-600 text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            + Cadastrar cliente
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700">Cliente *</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full mt-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-3 text-sm focus:border-secondary-400 outline-none"
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.whatsapp ? ` · ${c.whatsapp}` : ''}
                </option>
              ))}
            </select>
            <Link
              href="/app/clientes"
              className="block text-right text-xs text-secondary-600 underline mt-1"
            >
              + cadastrar novo cliente
            </Link>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Valor *</label>
            <input
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="R$ 80,00"
              className="w-full mt-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-3 text-sm focus:border-secondary-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Descricao do servico/produto *</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Manicure - kit completo"
              className="w-full mt-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-3 text-sm focus:border-secondary-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full mt-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-3 text-sm focus:border-secondary-400 outline-none"
            />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          <button
            onClick={gerarEEnviar}
            disabled={enviando}
            className="w-full bg-gradient-cool text-white font-bold py-4 rounded-2xl mt-2 shadow-glow-cool active:scale-95 disabled:opacity-50"
          >
            {enviando ? '⏳ Gerando...' : '🚀 Gerar e enviar'}
          </button>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-800 leading-relaxed">
            <span className="font-bold">⚠️ Importante:</span> recibo NAO e nota fiscal.
            Pra clientes que exigem NF, emita pelo Emissor Nacional (nfse.gov.br) — voce
            pode acompanhar pendencias em &quot;Notas pendentes&quot;.
          </div>
        </div>
      )}
    </main>
  );
}

export default function NovoReciboPage() {
  return (
    <Suspense fallback={<main className="flex-1 p-5"><div className="text-gray-400">Carregando...</div></main>}>
      <NovoReciboInner />
    </Suspense>
  );
}
