'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Saude = {
  nivel: 'saudavel' | 'atencao' | 'risco' | 'sem_dados';
  percentPessoal: number;
  totalDespesas: number;
  totalPessoal: number;
  totalRetiradas: number;
  totalSaidas: number;
  countPessoais: number;
  topPessoais: {
    id: string;
    date: string;
    amount: number;
    description: string;
    contraparte: string | null;
    category: string;
  }[];
  txCount: number;
  month: string;
};

const NIVEL_INFO: Record<Saude['nivel'], {
  emoji: string;
  cor: string;
  bgCor: string;
  label: string;
  texto: string;
}> = {
  saudavel: {
    emoji: '✅',
    cor: 'text-green-700',
    bgCor: 'bg-green-50 border-green-300',
    label: 'Saudavel',
    texto: 'Voce esta separando bem pessoal de empresa. Continue assim!',
  },
  atencao: {
    emoji: '⚠️',
    cor: 'text-yellow-700',
    bgCor: 'bg-yellow-50 border-yellow-300',
    label: 'Atencao',
    texto: 'Comecou a misturar gastos pessoais na conta da empresa. Vale ajustar.',
  },
  risco: {
    emoji: '🚨',
    cor: 'text-red-700',
    bgCor: 'bg-red-50 border-red-300',
    label: 'Risco fiscal',
    texto: 'Mistura alta de pessoal e empresa. Pode dar problema com o fisco.',
  },
  sem_dados: {
    emoji: '🤷',
    cor: 'text-gray-700',
    bgCor: 'bg-gray-50 border-gray-200',
    label: 'Sem dados suficientes',
    texto: 'Importe mais transacoes pra calcular sua saude PF/PJ.',
  },
};

const CATEGORIA_EMOJI: Record<string, string> = {
  alimentacao: '🍔', lazer: '🎬', casa: '🏡', saude: '💊',
  transporte_pessoal: '🚕', familia: '👨‍👩‍👧', outros_pessoal: '🎈',
};

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function SaudePage() {
  const router = useRouter();
  const [data, setData] = useState<Saude | null>(null);
  const [convertendo, setConvertendo] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/saude');
    const d = await res.json();
    setData(d);
  }

  useEffect(() => {
    load();
  }, []);

  async function converter() {
    if (!data) return;
    const ok = confirm(
      `Converter ${data.countPessoais} ${data.countPessoais === 1 ? 'transacao pessoal' : 'transacoes pessoais'} (R$ ${data.totalPessoal.toFixed(2)}) em uma retirada formal unica?\n\nIsso organiza a contabilidade e nao some com o dinheiro.\nVoce pode reverter depois se quiser.`,
    );
    if (!ok) return;

    setConvertendo(true);
    setResultado(null);
    try {
      const res = await fetch('/api/saude/converter-retirada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: data.month }),
      });
      const d = await res.json();
      if (!res.ok) {
        setResultado('Erro: ' + (d.error ?? 'desconhecido'));
      } else {
        setResultado(`✓ Convertido! ${d.retirada.convertedCount} transacoes viraram 1 retirada formal.`);
        await load();
      }
    } catch (e: any) {
      setResultado('Erro: ' + e.message);
    } finally {
      setConvertendo(false);
    }
  }

  if (!data) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Carregando...</div>
      </main>
    );
  }

  const info = NIVEL_INFO[data.nivel];

  return (
    <main className="flex-1 p-5">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">🏥 Saude PF/PJ</h1>
        <p className="text-sm text-gray-500">
          Misturar gastos pessoais com da empresa pode dar problema fiscal.
        </p>
      </div>

      {/* Card principal */}
      <div className={`${info.bgCor} border-2 rounded-3xl p-5 mb-6 shadow-soft animate-pop-in`}>
        <div className="text-center">
          <div className="text-6xl mb-2">{info.emoji}</div>
          <div className={`text-xs uppercase tracking-wide font-bold ${info.cor} mb-1`}>
            {info.label}
          </div>
          <div className="text-5xl font-extrabold text-gray-900 mb-2">
            {data.percentPessoal}%
          </div>
          <div className="text-xs text-gray-600 mb-3">
            das saidas do mes sao gastos pessoais
          </div>
          <div className="text-sm text-gray-700 max-w-xs mx-auto">
            {info.texto}
          </div>
        </div>
      </div>

      {/* Detalhamento numerico */}
      {data.totalSaidas > 0 && (
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 mb-6 shadow-soft">
          <div className="text-sm font-bold text-gray-900 mb-3">📊 Detalhamento desse mes</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">📉 Despesas do trabalho</span>
              <span className="font-bold text-gray-900">{formatBRL(data.totalDespesas)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">🛒 Gastos pessoais</span>
              <span className={`font-bold ${data.percentPessoal > 30 ? 'text-red-600' : data.percentPessoal > 10 ? 'text-yellow-700' : 'text-gray-900'}`}>
                {formatBRL(data.totalPessoal)}
              </span>
            </div>
            {data.totalRetiradas > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">🏦 Retiradas</span>
                <span className="font-bold text-gray-900">{formatBRL(data.totalRetiradas)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
              <span className="text-gray-900 font-bold">Total saidas</span>
              <span className="font-extrabold text-gray-900">{formatBRL(data.totalSaidas)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Lista de pessoais detectados */}
      {data.topPessoais.length > 0 && (
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 mb-6 shadow-soft">
          <div className="text-sm font-bold text-gray-900 mb-3">
            🛒 Maiores gastos pessoais detectados
          </div>
          <div className="space-y-2">
            {data.topPessoais.map((tx) => (
              <Link
                key={tx.id}
                href={`/app/transacao/${tx.id}`}
                className="flex justify-between items-center bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-lg">{CATEGORIA_EMOJI[tx.category] ?? '🛒'}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {tx.contraparte ?? tx.description}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {tx.category.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold text-gray-900 shrink-0 ml-2">
                  {formatBRL(Math.abs(tx.amount))}
                </div>
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            💡 Toque numa transacao pra editar - se nao for pessoal, marque o tipo certo.
          </p>
        </div>
      )}

      {/* Card de conversao - aparece quando ha gastos pessoais */}
      {data.countPessoais > 0 && (
        <div className="bg-gradient-cool text-white rounded-3xl p-5 mb-6 shadow-glow-cool relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-7xl opacity-10">🏦</div>
          <div className="relative">
            <div className="text-2xl mb-2">✨</div>
            <div className="font-bold text-lg mb-2">
              Quer organizar isso de uma vez?
            </div>
            <p className="text-sm text-blue-100 mb-4 leading-relaxed">
              A gente pode juntar essas {data.countPessoais} {data.countPessoais === 1 ? 'transacao' : 'transacoes'} pessoais
              ({formatBRL(data.totalPessoal)}) em <span className="font-bold">uma retirada formal unica</span>.
              Vira movimento legitimo na sua contabilidade.
            </p>

            <div className="bg-white/15 backdrop-blur rounded-xl p-3 mb-4 text-xs leading-relaxed">
              <div className="font-bold mb-1">🔍 O que muda:</div>
              <ul className="space-y-1">
                <li>✓ Score PF/PJ vira saudavel</li>
                <li>✓ Contador entende em segundos</li>
                <li>✓ Sem alterar o saldo - so reorganiza</li>
                <li>✓ Pode reverter depois se quiser</li>
              </ul>
            </div>

            <button
              onClick={converter}
              disabled={convertendo}
              className="w-full bg-white text-secondary-700 font-bold py-3 rounded-2xl hover:scale-105 active:scale-95 transition disabled:opacity-50"
            >
              {convertendo ? '⏳ Convertendo...' : '🏦 Converter em retirada formal'}
            </button>

            {resultado && (
              <div className="mt-3 bg-white/20 rounded-xl p-3 text-sm text-center font-medium">
                {resultado}
              </div>
            )}

            <p className="text-xs text-blue-200 mt-3 text-center">
              ⚠️ Isso e organizacao contabil. Confirme com seu contador antes de fechar o ano.
            </p>
          </div>
        </div>
      )}

      {/* Dicas - so quando atencao ou risco */}
      {(data.nivel === 'atencao' || data.nivel === 'risco') && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
          <div className="text-sm font-bold text-blue-900 mb-2">💡 Como melhorar:</div>
          <ul className="text-xs text-blue-800 space-y-2 leading-relaxed">
            <li>
              <span className="font-bold">1. Separe as contas:</span> use uma conta so pra empresa e outra so pra voce. Bancos digitais (Nubank PJ, Inter PJ) sao gratis.
            </li>
            <li>
              <span className="font-bold">2. Quando precisar gastar do seu:</span> faca uma <span className="font-semibold">retirada</span> oficial da empresa pra conta pessoal. Isso e legitimo e o app marca certo.
            </li>
            <li>
              <span className="font-bold">3. Revise a classificacao:</span> talvez algo aqui foi marcado errado como pessoal. Edite os tipos.
            </li>
            <li>
              <span className="font-bold">4. Em duvida:</span> fale com seu contador ou no Hello Work do empreendedor. Misturar muito pode dar problema na malha fina.
            </li>
          </ul>
        </div>
      )}

      {data.txCount < 5 && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
          <div className="text-3xl mb-2">📥</div>
          <div className="text-sm text-gray-700 mb-3">
            Importe mais um extrato pra ter dados melhores.
          </div>
          <Link
            href="/onboarding/upload"
            className="inline-block bg-gradient-cool text-white text-sm font-bold py-2 px-5 rounded-xl"
          >
            Importar agora
          </Link>
        </div>
      )}
    </main>
  );
}
