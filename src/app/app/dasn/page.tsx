'use client';

/**
 * Tela DASN-SIMEI: mostra os 2 numeros que o MEI precisa pra declarar
 * (receita comercio/industria e receita servicos), com botao "Copiar"
 * pra cada um e botao "Abrir portal" pra ir direto pra Receita.
 *
 * Tambem permite ajustar a divisao manualmente se a atividade for mista,
 * porque a sugestao 50/50 do server e so um chute inicial.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type DasnData = {
  year: number;
  user: {
    name: string | null;
    regime: string | null;
    meiAtividade: string;
  };
  receitaBruta: number;
  receitaComercio: number;
  receitaServicos: number;
  divisaoNota: string | null;
  transacoesCount: number;
  meiLimit: number;
  passouTeto: boolean;
  passouTetoTolerancia: boolean;
  aberto: boolean;
  diasRestantes: number | null;
  periodoInicio: string;
  periodoFim: string;
  portalUrl: string;
};

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumeroPortal(n: number): string {
  // Receita pede valor com virgula, sem R$. Ex: 12345,67
  return n.toFixed(2).replace('.', ',');
}

export default function DasnPage() {
  const router = useRouter();
  const [data, setData] = useState<DasnData | null>(null);
  const [year, setYear] = useState(() => new Date().getFullYear() - 1);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<'comercio' | 'servicos' | null>(null);
  const [editandoDivisao, setEditandoDivisao] = useState(false);
  const [comercioCustom, setComercioCustom] = useState<number | null>(null);

  async function load(y: number) {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/dasn?year=${y}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'erro');
      setData(j);
      setComercioCustom(j.receitaComercio);
    } catch (e: any) {
      setErro(e?.message ?? 'erro');
    }
    setLoading(false);
  }

  useEffect(() => {
    load(year);
  }, [year]);

  async function copiar(tipo: 'comercio' | 'servicos', valor: number) {
    try {
      await navigator.clipboard.writeText(formatNumeroPortal(valor));
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      alert('Nao consegui copiar. Selecione manualmente: ' + formatNumeroPortal(valor));
    }
  }

  if (loading) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Carregando...</div>
      </main>
    );
  }

  if (erro || !data) {
    return (
      <main className="flex-1 p-5">
        <button
          onClick={() => router.back()}
          className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center"
        >
          ←
        </button>
        <div className="text-red-700">{erro ?? 'Erro'}</div>
      </main>
    );
  }

  const comercio = comercioCustom ?? data.receitaComercio;
  const servicos = data.receitaBruta - comercio;
  const divisaoMista = data.user.meiAtividade === 'comercio_servicos';

  return (
    <main className="flex-1 p-5">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">📋 DASN-SIMEI</h1>
        <p className="text-sm text-gray-500">
          Declaracao anual obrigatoria do MEI. Voce digita 2 numeros no portal
          da Receita e pronto.
        </p>
      </div>

      {/* Seletor de ano */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-3 mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Ano-base</span>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-sm font-bold"
        >
          {[0, 1, 2, 3].map((offset) => {
            const y = new Date().getFullYear() - 1 - offset;
            return (
              <option key={y} value={y}>
                {y}
              </option>
            );
          })}
        </select>
      </div>

      {/* Status do prazo */}
      {data.aberto ? (
        <div className={`rounded-2xl p-4 mb-4 text-sm border-2 ${
          (data.diasRestantes ?? 999) < 30
            ? 'bg-red-50 border-red-300 text-red-900'
            : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          <div className="font-bold mb-1">
            {(data.diasRestantes ?? 999) < 30 ? '🚨 Prazo apertado' : '📅 Prazo aberto'}
          </div>
          <div className="text-xs leading-relaxed">
            Prazo final: <strong>31 de maio de {data.year + 1}</strong>
            {data.diasRestantes !== null && ` (${data.diasRestantes} dias)`}
            . Se nao declarar, multa minima R$ 50 e o CNPJ pode ficar irregular.
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 mb-4 text-sm">
          <div className="font-bold text-gray-800 mb-1">
            ⏳ Fora do prazo de declaracao
          </div>
          <div className="text-xs text-gray-600 leading-relaxed">
            A DASN-{data.year} pode ser declarada de 1 de janeiro a 31 de maio
            de {data.year + 1}. Voce ja pode preparar os numeros aqui.
          </div>
        </div>
      )}

      {/* Receita bruta total */}
      <div className="bg-white border-2 border-gray-200 rounded-3xl p-5 mb-4 text-center">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
          Receita bruta {data.year}
        </div>
        <div className="text-3xl font-extrabold text-gray-900">
          {brl(data.receitaBruta)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {data.transacoesCount} transacao{data.transacoesCount === 1 ? '' : 'oes'}
        </div>

        {/* Aviso se passou do teto */}
        {data.passouTeto && (
          <div className={`mt-3 text-xs rounded-xl p-3 leading-relaxed ${
            data.passouTetoTolerancia
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-orange-50 border border-orange-200 text-orange-800'
          }`}>
            {data.passouTetoTolerancia ? (
              <>
                <strong>🚨 Voce passou de 20% acima do teto.</strong> Voce sera
                desenquadrada do MEI retroativamente e precisa procurar contador.
              </>
            ) : (
              <>
                <strong>⚠️ Voce passou do teto MEI ({brl(data.meiLimit)}).</strong>
                {' '}Vai pagar DAS extra sobre o excesso e em {data.year + 1} sera
                migrada pro Simples Nacional. Considere falar com contador.
              </>
            )}
          </div>
        )}
      </div>

      {/* Os 2 numeros pra declarar */}
      <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">
        📝 Numeros pra digitar no portal
      </h2>

      <div className="space-y-3 mb-4">
        {/* Comercio/Industria */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
          <div className="flex justify-between items-start gap-3 mb-2">
            <div>
              <div className="text-xs text-gray-500 font-semibold">Comercio / Industria</div>
              <div className="text-2xl font-extrabold text-gray-900">{brl(comercio)}</div>
            </div>
            <button
              onClick={() => copiar('comercio', comercio)}
              className="bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95"
            >
              {copiado === 'comercio' ? '✓ Copiado!' : '📋 Copiar'}
            </button>
          </div>
          <div className="text-xs text-gray-500">
            Valor a digitar no portal: <code className="bg-gray-100 px-1 rounded">{formatNumeroPortal(comercio)}</code>
          </div>
        </div>

        {/* Servicos */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
          <div className="flex justify-between items-start gap-3 mb-2">
            <div>
              <div className="text-xs text-gray-500 font-semibold">Prestacao de servico</div>
              <div className="text-2xl font-extrabold text-gray-900">{brl(servicos)}</div>
            </div>
            <button
              onClick={() => copiar('servicos', servicos)}
              className="bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95"
            >
              {copiado === 'servicos' ? '✓ Copiado!' : '📋 Copiar'}
            </button>
          </div>
          <div className="text-xs text-gray-500">
            Valor a digitar no portal: <code className="bg-gray-100 px-1 rounded">{formatNumeroPortal(servicos)}</code>
          </div>
        </div>
      </div>

      {/* Nota sobre a divisao */}
      {data.divisaoNota && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 mb-4 text-xs text-yellow-900 leading-relaxed">
          <strong>Sobre a divisao:</strong> {data.divisaoNota}
          {divisaoMista && !editandoDivisao && (
            <button
              onClick={() => setEditandoDivisao(true)}
              className="block mt-2 text-yellow-900 underline font-semibold"
            >
              Ajustar divisao manualmente →
            </button>
          )}
        </div>
      )}

      {/* Editor de divisao manual (so pra atividade mista) */}
      {editandoDivisao && divisaoMista && (
        <div className="bg-white border-2 border-yellow-300 rounded-2xl p-4 mb-4">
          <div className="text-xs font-bold text-gray-800 mb-2">
            Quanto da sua receita foi comercio/industria?
          </div>
          <input
            type="range"
            min={0}
            max={data.receitaBruta}
            step={Math.max(1, data.receitaBruta / 100)}
            value={comercio}
            onChange={(e) => setComercioCustom(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>R$ 0</span>
            <span>{brl(data.receitaBruta)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-center">
            <div className="bg-gray-50 rounded-xl p-2">
              <div className="text-xs text-gray-500">Comercio</div>
              <div className="text-sm font-bold">{brl(comercio)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2">
              <div className="text-xs text-gray-500">Servicos</div>
              <div className="text-sm font-bold">{brl(servicos)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Botao pra abrir o portal */}
      <a
        href={data.portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-gradient-cool text-white text-center font-bold py-4 rounded-2xl shadow-glow-cool active:scale-95 mb-4"
      >
        🚀 Abrir portal da Receita pra declarar
      </a>

      {/* Como funciona */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 leading-relaxed">
        <div className="font-bold mb-2">💡 Como declarar passo a passo:</div>
        <ol className="space-y-1 list-decimal list-inside">
          <li>Toque em "Abrir portal da Receita" acima</li>
          <li>Faca login com gov.br (CPF + senha gov.br)</li>
          <li>Escolha "Original" e o ano-base {data.year}</li>
          <li>Cole os 2 valores acima nos campos correspondentes</li>
          <li>Confirme e gere o recibo</li>
          <li>Salve o PDF do recibo</li>
        </ol>
        <div className="mt-2 text-blue-800">
          A declaracao em si leva uns 3 minutos.
        </div>
      </div>
    </main>
  );
}
