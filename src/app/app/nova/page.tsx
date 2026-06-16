'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TX_TYPE_INFO, type TxType } from '@/lib/tx-types';

const CATEGORIAS_DESPESA = [
  { value: 'produto', label: 'Produto / Insumo', emoji: '🛒', deductible: true },
  { value: 'equipamento', label: 'Equipamento', emoji: '🔧', deductible: true },
  { value: 'marketing', label: 'Marketing / Anuncio', emoji: '📣', deductible: true },
  { value: 'transporte', label: 'Transporte (trabalho)', emoji: '🚗', deductible: true },
  { value: 'aluguel', label: 'Aluguel / Espaco', emoji: '🏠', deductible: true },
  { value: 'servicos', label: 'Servicos / Taxas', emoji: '🧾', deductible: true },
  { value: 'curso', label: 'Curso / Treinamento', emoji: '📚', deductible: true },
  { value: 'outros_trabalho', label: 'Outros (trabalho)', emoji: '💼', deductible: true },
];

const CATEGORIAS_PESSOAL = [
  { value: 'alimentacao', label: 'Alimentacao', emoji: '🍔' },
  { value: 'lazer', label: 'Lazer', emoji: '🎬' },
  { value: 'casa', label: 'Casa (luz, agua, net)', emoji: '🏡' },
  { value: 'saude', label: 'Saude', emoji: '💊' },
  { value: 'transporte_pessoal', label: 'Transporte pessoal', emoji: '🚕' },
  { value: 'familia', label: 'Familia', emoji: '👨‍👩‍👧' },
  { value: 'outros_pessoal', label: 'Outros (pessoal)', emoji: '🎈' },
];

const TIPOS_AVANCADOS: TxType[] = [
  'transferencia',
  'prolabore',
  'retirada',
  'emprestimo',
  'investimento',
  'reembolso',
];

type TipoBasico = 'receita' | 'despesa' | 'pessoal';

export default function NovaTransacao() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TxType>('receita');
  const [showAvancados, setShowAvancados] = useState(false);
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [contraparte, setContraparte] = useState('');
  const [categoria, setCategoria] = useState('cliente');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function salvar() {
    setLoading(true);
    setError(null);
    try {
      const valorNumber = parseFloat(valor.replace(',', '.'));
      if (isNaN(valorNumber) || valorNumber <= 0) {
        setError('Valor invalido');
        setLoading(false);
        return;
      }

      // Determinar sinal: receita/reembolso entram positivos, resto negativo por padrao
      const isPositivo = tipo === 'receita' || tipo === 'reembolso';
      const amount = isPositivo ? valorNumber : -valorNumber;

      let cat = categoria;
      let isDeductible = false;
      let isPersonal = false;

      if (tipo === 'receita') {
        cat = 'cliente';
      } else if (tipo === 'despesa') {
        const found = CATEGORIAS_DESPESA.find((c) => c.value === categoria);
        isDeductible = found?.deductible ?? false;
      } else if (tipo === 'pessoal') {
        isPersonal = true;
      } else {
        // Tipos avancados: categoria igual ao tipo
        cat = tipo;
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(data + 'T12:00:00').toISOString(),
          amount,
          description: descricao || TX_TYPE_INFO[tipo].label,
          contraparte: contraparte || undefined,
          type: tipo,
          category: cat,
          isDeductible,
          isPersonal,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Erro');
        setLoading(false);
        return;
      }

      router.push('/app');
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  function trocarTipo(novo: TxType) {
    setTipo(novo);
    if (novo === 'receita') setCategoria('cliente');
    else if (novo === 'despesa') setCategoria('produto');
    else if (novo === 'pessoal') setCategoria('alimentacao');
    else setCategoria(novo);
  }

  const categorias =
    tipo === 'despesa' ? CATEGORIAS_DESPESA :
    tipo === 'pessoal' ? CATEGORIAS_PESSOAL :
    [];

  const info = TX_TYPE_INFO[tipo];
  const isBasico = tipo === 'receita' || tipo === 'despesa' || tipo === 'pessoal';

  return (
    <main className="flex-1 p-5">
      <button onClick={() => router.back()} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition">
        ←
      </button>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Novo lancamento</h1>

      {/* 3 tipos basicos */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => trocarTipo('receita')}
          className={`py-4 rounded-2xl font-bold text-sm transition ${
            tipo === 'receita'
              ? 'bg-gradient-money text-white shadow-glow-money scale-105'
              : 'bg-white border-2 border-gray-200 text-gray-600'
          }`}
        >
          <div className="text-2xl mb-1">💰</div>
          Recebi
        </button>
        <button
          onClick={() => trocarTipo('despesa')}
          className={`py-4 rounded-2xl font-bold text-sm transition ${
            tipo === 'despesa'
              ? 'bg-gradient-warning text-white shadow-glow-yellow scale-105'
              : 'bg-white border-2 border-gray-200 text-gray-600'
          }`}
        >
          <div className="text-2xl mb-1">📉</div>
          Trabalho
        </button>
        <button
          onClick={() => trocarTipo('pessoal')}
          className={`py-4 rounded-2xl font-bold text-sm transition ${
            tipo === 'pessoal'
              ? 'bg-gray-800 text-white shadow-soft scale-105'
              : 'bg-white border-2 border-gray-200 text-gray-600'
          }`}
        >
          <div className="text-2xl mb-1">🛒</div>
          Pessoal
        </button>
      </div>

      {/* Toggle pra mostrar tipos avancados */}
      <button
        onClick={() => setShowAvancados((s) => !s)}
        className="w-full text-xs text-secondary-600 underline py-2 mb-3"
      >
        {showAvancados ? 'Ocultar' : '+ Outros tipos'} (transferencia, retirada, emprestimo, etc.)
      </button>

      {showAvancados && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {TIPOS_AVANCADOS.map((t) => {
            const i = TX_TYPE_INFO[t];
            return (
              <button
                key={t}
                onClick={() => trocarTipo(t)}
                className={`py-3 rounded-2xl font-semibold text-xs transition ${
                  tipo === t
                    ? 'bg-secondary-500 text-white shadow-soft scale-105'
                    : 'bg-white border-2 border-gray-200 text-gray-600'
                }`}
              >
                <div className="text-xl mb-0.5">{i.emoji}</div>
                <div className="leading-tight">{i.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Box explicativa do tipo */}
      {!isBasico && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-xl shrink-0">{info.emoji}</span>
            <div className="flex-1">
              <div className="font-bold text-blue-900 text-sm">{info.label}</div>
              <div className="text-xs text-blue-800 leading-relaxed">{info.descricao}</div>
              <div className="text-xs text-blue-700 mt-1">
                {info.contaNoLucro ? '💡 Entra no calculo de lucro.' : '⚠️ Nao entra no lucro.'}
                {info.contaNoFaturamento ? ' Conta no limite MEI.' : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      <label className="block mb-4">
        <span className="block text-sm font-semibold text-gray-700 mb-2">Valor</span>
        <div className="relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl pl-14 pr-5 py-5 text-3xl font-extrabold text-gray-900 shadow-soft transition"
          />
        </div>
      </label>

      <label className="block mb-4">
        <span className="block text-sm font-semibold text-gray-700 mb-2">
          {tipo === 'receita' ? 'De quem? 👤' : tipo === 'transferencia' ? 'Pra qual conta? 🏦' : 'Pra quem/onde? 🏪'}
        </span>
        <input
          type="text"
          value={contraparte}
          onChange={(e) => setContraparte(e.target.value)}
          placeholder={tipo === 'receita' ? 'Nome do cliente' : 'Nome'}
          className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 shadow-soft transition"
        />
      </label>

      {/* Categoria so pra despesa e pessoal */}
      {(tipo === 'despesa' || tipo === 'pessoal') && (
        <div className="block mb-4">
          <span className="block text-sm font-semibold text-gray-700 mb-2">Categoria</span>
          <div className="grid grid-cols-2 gap-2">
            {categorias.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategoria(c.value)}
                className={`py-3 px-4 rounded-2xl text-sm font-medium transition flex items-center gap-2 ${
                  categoria === c.value
                    ? 'bg-secondary-100 border-2 border-secondary-500 text-secondary-700'
                    : 'bg-white border-2 border-gray-200 text-gray-700'
                }`}
              >
                <span className="text-xl">{c.emoji}</span>
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block mb-4">
        <span className="block text-sm font-semibold text-gray-700 mb-2">Descricao (opcional)</span>
        <input
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Servico, motivo..."
          className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 shadow-soft transition"
        />
      </label>

      <label className="block mb-6">
        <span className="block text-sm font-semibold text-gray-700 mb-2">Data</span>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 shadow-soft transition"
        />
      </label>

      {error && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          {error}
        </p>
      )}

      <button
        onClick={salvar}
        disabled={loading || !valor}
        className="w-full bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50 text-lg"
      >
        {loading ? '⏳ Salvando...' : '✨ Salvar'}
      </button>
    </main>
  );
}
