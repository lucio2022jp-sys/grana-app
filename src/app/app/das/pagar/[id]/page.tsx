'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const PGMEI_URL = 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/';
const PGDAS_URL = 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgdasd.app/default.aspx';

type CodigoData = {
  valor: number;
  month: number;
  year: number;
  dueDate: string;
  pixCopiaCola: string;
  qrCodeDataUrl: string | null;
  linhaDigitavel?: string;
  codigoBarras?: string;
  isDemo: boolean;
  expiresAt?: string;
};

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PagarDASPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<CodigoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState<'pix' | 'linha' | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetch(`/api/das/${params.id}/gerar`, { method: 'POST' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error ?? 'Erro ao gerar codigo');
        } else {
          setData(d);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function copiar(text: string, tipo: 'pix' | 'linha') {
    try {
      await navigator.clipboard.writeText(text);
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 2000);
    }
  }

  async function marcarPago() {
    setMarking(true);
    await fetch(`/api/das/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paidAt: new Date().toISOString() }),
    });
    router.push('/app/das');
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gradient-cool">
        <div className="text-white text-center">
          <div className="text-5xl mb-3 animate-pulse-soft">⚡</div>
          <div className="font-semibold">Gerando seu codigo...</div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex-1 p-5">
        <button
          onClick={() => router.back()}
          className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
        >
          ←
        </button>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">😞</div>
          <div className="font-semibold text-red-800 mb-2">Nao deu pra gerar</div>
          <div className="text-sm text-red-700">{error}</div>
        </div>
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

      <div className="text-center mb-6 animate-pop-in">
        <div className="text-xs uppercase tracking-wide text-secondary-600 font-bold mb-1">
          Pagar
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 capitalize">
          DAS de {MESES[data.month - 1]} {data.year}
        </h1>
        <div className="text-3xl font-extrabold mt-3 bg-gradient-cool bg-clip-text text-transparent">
          {formatBRL(data.valor)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Vence em {new Date(data.dueDate).toLocaleDateString('pt-BR')}
        </div>
      </div>

      {/* Aviso demo */}
      {data.isDemo && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-5 animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="flex items-start gap-2">
            <span className="text-2xl shrink-0">⚠️</span>
            <div className="text-xs text-yellow-900 leading-relaxed">
              <span className="font-bold">Modo demo ativado.</span> O codigo abaixo
              tem formato valido mas nao chega na Receita Federal. Pra pagamento real,
              use o link do PGMEI no fim da pagina (ou configure DAS_PROVIDER_API_KEY no servidor).
            </div>
          </div>
        </div>
      )}

      {/* QR Code */}
      {data.qrCodeDataUrl && (
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 mb-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
          <div className="text-center mb-3">
            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
              📱 Escaneie no app do banco
            </div>
            <div className="text-sm text-gray-700">
              Abre o app do banco, vai em Pix → Pagar → Ler QR Code
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 flex justify-center">
            <img
              src={data.qrCodeDataUrl}
              alt="QR Code do Pix"
              className="w-full max-w-xs"
            />
          </div>
        </div>
      )}

      {/* Pix copia-cola */}
      <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 mb-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.25s', opacity: 0 }}>
        <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
          📋 Pix copia-e-cola
        </div>
        <div className="text-sm text-gray-700 mb-3">
          Cola no app do banco se nao puder escanear o QR Code.
        </div>
        <div className="bg-gray-50 rounded-2xl p-3 mb-3">
          <div className="text-xs text-gray-700 break-all font-mono leading-relaxed">
            {data.pixCopiaCola}
          </div>
        </div>
        <button
          onClick={() => copiar(data.pixCopiaCola, 'pix')}
          className={`w-full font-bold py-4 rounded-2xl transition hover:scale-105 active:scale-95 ${
            copiado === 'pix'
              ? 'bg-gradient-money text-white shadow-glow-money'
              : 'bg-gradient-cool text-white shadow-glow-cool'
          }`}
        >
          {copiado === 'pix' ? '✓ Copiado!' : '📋 Copiar codigo Pix'}
        </button>
      </div>

      {/* Linha digitavel (boleto) - se tiver */}
      {data.linhaDigitavel && (
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 mb-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.35s', opacity: 0 }}>
          <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
            🏦 Boleto bancario
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 mb-3">
            <div className="text-sm text-gray-700 font-mono break-all">
              {data.linhaDigitavel}
            </div>
          </div>
          <button
            onClick={() => copiar(data.linhaDigitavel!, 'linha')}
            className={`w-full font-bold py-3 rounded-2xl transition hover:scale-105 active:scale-95 ${
              copiado === 'linha'
                ? 'bg-gradient-money text-white shadow-glow-money'
                : 'bg-white border-2 border-gray-300 text-gray-800'
            }`}
          >
            {copiado === 'linha' ? '✓ Copiado!' : '📋 Copiar linha digitavel'}
          </button>
        </div>
      )}

      {/* Instrucoes */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
        <div className="text-sm font-bold text-blue-900 mb-2">📖 Como pagar:</div>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>Abre o app do seu banco</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Vai em Pix &gt; Pagar &gt; Ler QR Code (ou Copia e cola)</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Confere o valor: {formatBRL(data.valor)}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Confirma o pagamento</span>
          </li>
        </ol>
      </div>

      {/* Acoes */}
      <button
        onClick={marcarPago}
        disabled={marking}
        className="w-full bg-gradient-money text-white font-bold py-5 rounded-3xl shadow-glow-money transition hover:scale-105 active:scale-95 disabled:opacity-50 mb-3 text-lg"
      >
        {marking ? '⏳ Salvando...' : '✓ Ja paguei, marcar como pago'}
      </button>

      {/* Link pro portal oficial - sempre */}
      <a
        href={PGMEI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-white border-2 border-gray-300 text-gray-800 font-semibold py-4 rounded-2xl text-center hover:scale-105 active:scale-95 transition"
      >
        🔗 Abrir PGMEI oficial
      </a>

      <p className="text-xs text-gray-400 text-center mt-6">
        {data.isDemo
          ? '⚠️ Codigo gerado em modo demo. Use o PGMEI oficial pra pagamento real.'
          : '✓ Codigo gerado pelo provedor oficial.'}
      </p>
    </main>
  );
}
