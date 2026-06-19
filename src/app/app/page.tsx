'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CapturarNotaButton from '@/components/CapturarNotaButton';

type Dashboard = {
  empty: boolean;
  receita: number;
  despesas: number;
  pessoal: number;
  retiradas: number;
  investimentos: number;
  emprestimos: number;
  prolabore: number;
  reembolsos: number;
  sobrou: number;
  meiPercent: number;
  yearReceita: number;
  topClientes: { nome: string; total: number }[];
  topDespesas: { categoria: string; total: number }[];
  txCount: number;
};

type DASCurrent = {
  id: string;
  month: number;
  year: number;
  value: number;
  dueDate: string;
  paidAt: string | null;
  status: 'em_dia' | 'proximo' | 'urgente' | 'atrasado' | 'pago';
  multa: number;
  total: number;
} | null;

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function monthName(d: Date) {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function diasRestantes(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const CATEGORIA_EMOJI: Record<string, string> = {
  produto: '🛒',
  equipamento: '🔧',
  marketing: '📣',
  transporte: '🚗',
  aluguel: '🏠',
  servicos: '🧾',
  curso: '📚',
  outros_trabalho: '💼',
  alimentacao: '🍔',
  lazer: '🎬',
  casa: '🏡',
  saude: '💊',
  transporte_pessoal: '🚕',
  familia: '👨‍👩‍👧',
  outros_pessoal: '🎈',
  cliente: '💰',
  outros: '📦',
};

export default function AppHome() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [das, setDas] = useState<DASCurrent>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [recurringCount, setRecurringCount] = useState(0);
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState(0);
  const [tendencia, setTendencia] = useState<{
    direcao: 'subindo' | 'descendo' | 'estavel' | 'sem_dados';
    lucroPct: number | null;
  } | null>(null);
  const [saude, setSaude] = useState<{
    nivel: 'saudavel' | 'atencao' | 'risco' | 'sem_dados';
    percentPessoal: number;
    countPessoais: number;
    totalPessoal: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData);
    fetch('/api/das')
      .then((r) => r.json())
      .then((d) => setDas(d.current));
    fetch('/api/transactions/pending')
      .then((r) => r.json())
      .then((d) => setPendingCount(d.count ?? 0));
    fetch('/api/recurring')
      .then((r) => r.json())
      .then((d) => setRecurringCount(d.count ?? 0));
    fetch('/api/saude')
      .then((r) => r.json())
      .then(setSaude);
    fetch('/api/avaliacoes')
      .then((r) => r.json())
      .then((d) => setAvaliacoesPendentes(d.pendentes?.length ?? 0));
    fetch('/api/evolucao?meses=6')
      .then((r) => r.json())
      .then((d) => setTendencia(d.tendencia));
  }, []);

  if (!data) {
    return (
      <main className="flex-1 p-6">
        <div className="text-gray-400">Carregando...</div>
      </main>
    );
  }

  if (data.empty) {
    return (
      <main className="flex-1 p-5">
        <div className="text-center mt-8 mb-6">
          <div className="text-7xl mb-4 animate-float">💸</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Vamos comecar!</h1>
          <p className="text-secondary-600 text-xs font-semibold mb-1">✨ Sua empresa no caminho certo</p>
          <p className="text-gray-600 text-sm capitalize">{monthName(new Date())}</p>
        </div>

        <div className="bg-gradient-cool text-white rounded-3xl p-6 mb-4 shadow-glow-cool text-center">
          <div className="text-4xl mb-3">📄</div>
          <h2 className="font-bold text-xl mb-2">Importar extrato Pix</h2>
          <p className="text-blue-100 text-sm mb-4">
            Em 30 segundos voce ja ve seus numeros
          </p>
          <Link
            href="/onboarding/upload"
            className="inline-block bg-white text-secondary-600 font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition"
          >
            Importar agora →
          </Link>
        </div>

        <Link
          href="/app/nova"
          className="block bg-white border-2 border-gray-200 hover:border-secondary-400 rounded-3xl p-5 text-center transition hover:scale-105 shadow-soft"
        >
          <div className="text-3xl mb-1">✏️</div>
          <div className="text-gray-700 font-medium">Lancar manualmente</div>
        </Link>

        <div className="mt-3">
          <CapturarNotaButton />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-5">
      <div className="mb-6 animate-pop-in">
        <h1 className="text-2xl font-extrabold text-gray-900">Resumo</h1>
        <p className="text-secondary-600 text-xs font-semibold">✨ Sua empresa no caminho certo</p>
        <p className="text-gray-500 capitalize text-sm">{monthName(new Date())}</p>
      </div>

      <div className="mb-4 animate-pop-in">
        <CapturarNotaButton />
      </div>

      {/* Alerta saude PF/PJ - so quando atencao ou risco */}
      {saude && (saude.nivel === 'atencao' || saude.nivel === 'risco') && (
        <Link
          href="/app/saude"
          className={`block rounded-3xl p-4 mb-4 shadow-soft hover:scale-[1.02] active:scale-95 transition animate-pop-in border-2 ${
            saude.nivel === 'risco'
              ? 'bg-red-50 border-red-300'
              : 'bg-yellow-50 border-yellow-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl shrink-0">
              {saude.nivel === 'risco' ? '🚨' : '⚠️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-bold uppercase tracking-wide ${
                saude.nivel === 'risco' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {saude.nivel === 'risco' ? 'Risco fiscal' : 'Atencao'}
              </div>
              <div className="font-bold text-gray-900 mt-0.5">
                Misturando pessoal com empresa
              </div>
              <div className="text-xs text-gray-700 mt-0.5">
                {saude.percentPessoal}% das saidas desse mes sao gastos pessoais
                {saude.countPessoais > 0 && ` (${saude.countPessoais} ${saude.countPessoais === 1 ? 'transacao' : 'transacoes'})`}.
              </div>
            </div>
            <div className="text-gray-400 text-2xl">›</div>
          </div>
        </Link>
      )}

      {/* Card de pendencias - so se houver */}
      {/* Card de pendencias - so se houver */}
      {avaliacoesPendentes > 0 && (
        <Link
          href="/app/avaliar"
          className="block bg-yellow-50 border-2 border-yellow-300 rounded-3xl p-4 mb-4 shadow-soft hover:scale-[1.02] active:scale-95 transition animate-pop-in"
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl shrink-0">⭐</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold uppercase tracking-wide text-yellow-700">
                Avalie seu contador
              </div>
              <div className="font-bold text-gray-900 mt-0.5">
                {avaliacoesPendentes} {avaliacoesPendentes === 1 ? 'avaliacao pendente' : 'avaliacoes pendentes'}
              </div>
              <div className="text-xs text-gray-700 mt-0.5">
                Faz mais de 30 dias. Como esta sendo a experiencia?
              </div>
            </div>
            <div className="text-yellow-400 text-2xl">›</div>
          </div>
        </Link>
      )}

      {pendingCount > 0 && (
        <Link
          href="/app/revisar"
          className="block bg-purple-50 border-2 border-purple-300 rounded-3xl p-4 mb-4 shadow-soft hover:scale-[1.02] active:scale-95 transition animate-pop-in"
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧠</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold uppercase tracking-wide text-purple-700">
                Quer ajudar a IA?
              </div>
              <div className="font-bold text-gray-900 mt-0.5">
                {pendingCount} {pendingCount === 1 ? 'transacao' : 'transacoes'} pra revisar
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                Confirme e o app aprende seu estilo de classificar.
              </div>
            </div>
            <div className="text-purple-400 text-2xl">›</div>
          </div>
        </Link>
      )}

      {/* Alerta DAS - so aparece se tiver DAS pendente urgente/atrasado */}
      {das && !das.paidAt && (das.status === 'urgente' || das.status === 'atrasado' || das.status === 'proximo') && (
        <Link
          href="/app/das"
          className={`block rounded-3xl p-5 mb-4 shadow-soft transition hover:scale-[1.02] active:scale-95 animate-pop-in ${
            das.status === 'atrasado' ? 'bg-red-50 border-2 border-red-300' :
            das.status === 'urgente' ? 'bg-orange-50 border-2 border-orange-300' :
            'bg-yellow-50 border-2 border-yellow-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="text-4xl">
              {das.status === 'atrasado' ? '🚨' : das.status === 'urgente' ? '🔥' : '⚠️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-bold uppercase tracking-wide ${
                das.status === 'atrasado' ? 'text-red-700' :
                das.status === 'urgente' ? 'text-orange-700' :
                'text-yellow-700'
              }`}>
                {das.status === 'atrasado' ? 'DAS atrasado!' :
                  das.status === 'urgente' ? 'DAS vence em breve' :
                  'Lembrete DAS'}
              </div>
              <div className="font-bold text-gray-900 capitalize mt-0.5">
                DAS de {MESES[das.month - 1]} {das.year}
              </div>
              <div className="text-sm text-gray-700 mt-0.5">
                {das.status === 'atrasado'
                  ? `Vencido em ${new Date(das.dueDate).toLocaleDateString('pt-BR')}`
                  : `Vence em ${diasRestantes(das.dueDate)} dia${diasRestantes(das.dueDate) > 1 ? 's' : ''}`}
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mt-2">
                {formatBRL(das.total)}
              </div>
            </div>
            <div className="text-gray-400 text-2xl">›</div>
          </div>
        </Link>
      )}

      {/* Card sobrou - destaque maximo */}
      <div className="bg-gradient-cool text-white rounded-3xl p-6 mb-3 shadow-glow-cool relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
        <div className="absolute -right-6 -top-6 text-9xl opacity-10">✨</div>
        <div className="text-sm font-semibold mb-1 opacity-90">Sobrou pra voce 💎</div>
        <div className="text-4xl font-extrabold relative z-10">{formatBRL(data.sobrou)}</div>
      </div>

      {/* Card de tendencia - so aparece se tem dados suficientes */}
      {tendencia && tendencia.direcao !== 'sem_dados' && tendencia.lucroPct !== null && (
        <Link
          href="/app/evolucao"
          className={`block rounded-2xl p-3 mb-3 shadow-soft transition hover:scale-[1.02] active:scale-95 animate-slide-up ${
            tendencia.direcao === 'subindo'
              ? 'bg-green-50 border border-green-200'
              : tendencia.direcao === 'descendo'
              ? 'bg-red-50 border border-red-200'
              : 'bg-gray-50 border border-gray-200'
          }`}
          style={{ animationDelay: '0.08s', opacity: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl shrink-0">
              {tendencia.direcao === 'subindo' && '📈'}
              {tendencia.direcao === 'descendo' && '📉'}
              {tendencia.direcao === 'estavel' && '➡️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600">
                {tendencia.direcao === 'subindo' && 'Lucro crescendo'}
                {tendencia.direcao === 'descendo' && 'Lucro caindo'}
                {tendencia.direcao === 'estavel' && 'Lucro estavel'}
              </div>
              <div className="font-extrabold text-base text-gray-900">
                {tendencia.lucroPct >= 0 ? '+' : ''}
                {tendencia.lucroPct}% vs media · ver evolucao
              </div>
            </div>
            <div className="text-gray-400 text-xl">›</div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gradient-money text-white rounded-2xl p-4 shadow-glow-money animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="text-xs font-semibold opacity-90">💰 Recebi</div>
          <div className="text-xl font-extrabold mt-1">{formatBRL(data.receita)}</div>
        </div>
        <div className="bg-gradient-warning text-white rounded-2xl p-4 shadow-glow-yellow animate-slide-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
          <div className="text-xs font-semibold opacity-90">📉 Trabalho</div>
          <div className="text-xl font-extrabold mt-1">{formatBRL(data.despesas)}</div>
        </div>
      </div>

      <div className="bg-gray-100 rounded-2xl p-4 mb-6 animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <div className="text-xs font-semibold text-gray-600">🛒 Pessoal</div>
        <div className="text-xl font-extrabold text-gray-800 mt-1">{formatBRL(data.pessoal)}</div>
      </div>

      {/* Outros movimentos - so aparece se houver */}
      {(data.retiradas > 0 || data.investimentos > 0 || data.emprestimos > 0 || data.prolabore > 0 || data.reembolsos !== 0) && (
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 mb-6 shadow-soft animate-slide-up" style={{ animationDelay: '0.22s', opacity: 0 }}>
          <div className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            🔁 Outros movimentos
          </div>
          <div className="space-y-2 text-sm">
            {data.prolabore > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700">👔 Pro-labore</span>
                <span className="font-bold text-indigo-600">{formatBRL(data.prolabore)}</span>
              </div>
            )}
            {data.retiradas > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700">🏦 Retiradas</span>
                <span className="font-bold text-purple-600">{formatBRL(data.retiradas)}</span>
              </div>
            )}
            {data.investimentos > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700">📈 Investimentos</span>
                <span className="font-bold text-cyan-600">{formatBRL(data.investimentos)}</span>
              </div>
            )}
            {data.emprestimos > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700">🤝 Emprestimos</span>
                <span className="font-bold text-teal-600">{formatBRL(data.emprestimos)}</span>
              </div>
            )}
            {data.reembolsos !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700">↩️ Reembolsos</span>
                <span className={`font-bold ${data.reembolsos > 0 ? 'text-pink-600' : 'text-gray-600'}`}>
                  {data.reembolsos > 0 ? '+' : ''}{formatBRL(data.reembolsos)}
                </span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
            Estes movimentos nao entram no calculo de lucro (exceto pro-labore e reembolso).
          </div>
        </div>
      )}

      {data.meiPercent > 0 && (
        <div className={`rounded-3xl p-5 mb-6 shadow-soft animate-slide-up ${
          data.meiPercent > 90 ? 'bg-red-50 border-2 border-red-300'
          : data.meiPercent > 70 ? 'bg-yellow-50 border-2 border-yellow-300'
          : 'bg-blue-50 border-2 border-blue-300'
        }`} style={{ animationDelay: '0.25s', opacity: 0 }}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-bold flex items-center gap-2">
              ⚠️ Limite MEI {new Date().getFullYear()}
            </div>
            <div className="text-2xl font-extrabold">{data.meiPercent}%</div>
          </div>
          <div className="bg-white rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${data.meiPercent > 90 ? 'bg-red-500' : data.meiPercent > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
              style={{ width: `${data.meiPercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-2 font-medium">
            R$ {data.yearReceita.toFixed(0)} de R$ 81.000
          </div>
        </div>
      )}

      {data.topClientes.length > 0 && (
        <div className="bg-white border-2 border-pink-100 rounded-3xl p-5 mb-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <div className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            👑 Suas melhores clientes
          </div>
          <div className="space-y-3">
            {data.topClientes.slice(0, 3).map((c, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-100 text-gray-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-gray-800 font-medium truncate">{c.nome}</span>
                </div>
                <span className="font-bold text-pink-600 ml-2">{formatBRL(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.topDespesas.length > 0 && (
        <div className="bg-white border-2 border-orange-100 rounded-3xl p-5 mb-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.35s', opacity: 0 }}>
          <div className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            📊 Onde foi o dinheiro
          </div>
          <div className="space-y-3">
            {data.topDespesas.slice(0, 4).map((d, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CATEGORIA_EMOJI[d.categoria] ?? '📦'}</span>
                  <span className="text-gray-800 font-medium capitalize">{d.categoria.replace('_', ' ')}</span>
                </div>
                <span className="font-bold text-orange-600">{formatBRL(d.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/app/transacoes"
        className="block bg-white border-2 border-gray-200 hover:border-secondary-400 rounded-3xl p-4 text-center text-gray-700 font-medium transition hover:scale-105 shadow-soft animate-slide-up"
        style={{ animationDelay: '0.4s', opacity: 0 }}
      >
        Ver todas as {data.txCount} transacoes →
      </Link>

      {recurringCount > 0 && (
        <Link
          href="/app/recorrentes"
          className="block bg-white border-2 border-secondary-200 hover:border-secondary-400 rounded-3xl p-4 text-center text-secondary-700 font-medium transition hover:scale-105 shadow-soft mt-3 animate-slide-up"
          style={{ animationDelay: '0.45s', opacity: 0 }}
        >
          🔁 {recurringCount} {recurringCount === 1 ? 'pagamento recorrente' : 'pagamentos recorrentes'} →
        </Link>
      )}

      {/* Indicador discreto de saude quando esta saudavel */}
      {saude && saude.nivel === 'saudavel' && (
        <Link
          href="/app/saude"
          className="block bg-green-50 border border-green-200 hover:border-green-400 rounded-2xl p-3 text-center text-green-700 text-xs font-medium transition mt-3"
        >
          ✓ Saude PF/PJ saudavel · {saude.percentPessoal}% pessoal
        </Link>
      )}
    </main>
  );
}
