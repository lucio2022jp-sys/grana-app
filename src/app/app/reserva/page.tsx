'use client';

/**
 * Pagina de reserva de impostos.
 *
 * Mostra meta do mes (DAS estimado), quanto ja foi reservado e barra de
 * progresso. Permite registrar contribuicoes (manuais ou via "reservar
 * sugerido"), ver historico dos ultimos 6 meses e remover contribuicoes
 * lancadas por engano.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Contribution = {
  id: string;
  amount: number;
  note: string | null;
  auto: boolean;
  createdAt: string;
};

type ReserveCurrent = {
  year: number;
  month: number;
  target: number;
  reserved: number;
  remaining: number;
  percent: number;
  source: 'mei' | 'simples_calc' | 'simples_default' | 'nenhum';
  receitaMes: number;
  contributions: Contribution[];
};

type HistoryRow = {
  year: number;
  month: number;
  target: number;
  reserved: number;
};

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const SOURCE_LABEL: Record<ReserveCurrent['source'], string> = {
  mei: 'DAS-MEI fixo do mes',
  simples_calc: 'DAS calculado pela receita do mes',
  simples_default: 'Estimativa de 8% do faturamento',
  nenhum: 'Sem regime tributario configurado',
};

export default function ReservaPage() {
  const [current, setCurrent] = useState<ReserveCurrent | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/tax-reserve');
      if (!res.ok) {
        setCurrent(null);
        return;
      }
      const d = await res.json();
      setCurrent(d.current);
      setHistory(d.history ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(amt: number, opts: { auto?: boolean; note?: string } = {}) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/tax-reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          note: opts.note,
          auto: opts.auto ?? false,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Erro ao registrar');
        return false;
      }
      await load();
      return true;
    } catch (e: any) {
      setError(e.message ?? 'Erro');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) {
      setError('Valor invalido');
      return;
    }
    const ok = await add(v, { note: note.trim() || undefined });
    if (ok) {
      setAmount('');
      setNote('');
    }
  }

  async function reservarSugerido() {
    if (!current) return;
    if (current.remaining <= 0) return;
    await add(current.remaining, {
      auto: true,
      note: 'Reserva automatica (faltante do mes)',
    });
  }

  async function remove(id: string) {
    if (!confirm('Remover esta contribuicao?')) return;
    const res = await fetch(`/api/tax-reserve?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) await load();
  }

  if (loading) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Carregando...</div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Faca login pra usar a reserva.</div>
      </main>
    );
  }

  const barColor =
    current.percent >= 100 ? 'bg-green-500'
      : current.percent >= 60 ? 'bg-blue-500'
        : 'bg-yellow-500';

  return (
    <main className="flex-1 p-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/app" className="text-2xl">←</Link>
        <h1 className="text-xl font-bold">Reserva de impostos</h1>
      </div>

      <p className="text-sm text-gray-600 mb-5">
        Separa um pedaco do faturamento todo mes pra nao ser pega de
        surpresa no DAS. A meta abaixo e estimada pelo seu regime atual.
      </p>

      {/* Card principal */}
      <div className="rounded-2xl border bg-white p-5 mb-6">
        <div className="text-sm text-gray-500 mb-1">
          {MESES[current.month - 1]} {current.year}
        </div>

        <div className="flex items-end justify-between mb-1">
          <div>
            <div className="text-3xl font-bold">{brl(current.reserved)}</div>
            <div className="text-sm text-gray-500">
              de {brl(current.target)} <span className="text-gray-400">({current.percent.toFixed(0)}%)</span>
            </div>
          </div>
          <div className="text-right">
            {current.remaining > 0 ? (
              <>
                <div className="text-sm text-gray-500">Falta</div>
                <div className="text-lg font-semibold text-red-600">
                  {brl(current.remaining)}
                </div>
              </>
            ) : (
              <div className="text-green-600 font-semibold">✓ Meta atingida</div>
            )}
          </div>
        </div>

        <div className="h-3 rounded bg-gray-200 overflow-hidden my-3">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: `${Math.min(100, current.percent)}%` }}
          />
        </div>

        <div className="text-xs text-gray-500 mb-3">
          {SOURCE_LABEL[current.source]}
          {current.receitaMes > 0 && (
            <> · Receita do mes: {brl(current.receitaMes)}</>
          )}
        </div>

        {current.remaining > 0 && current.target > 0 && (
          <button
            type="button"
            onClick={reservarSugerido}
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-60"
          >
            {saving ? 'Reservando...' : `Reservar ${brl(current.remaining)} agora`}
          </button>
        )}
      </div>

      {/* Form contribuicao manual */}
      <form onSubmit={submit} className="rounded-lg border bg-white p-4 mb-6 space-y-3">
        <div className="font-semibold">Adicionar contribuicao manual</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm text-gray-600 mb-1">Valor (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50,00"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ex: separado da receita do dia 15"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-gray-800 px-4 py-2 text-white disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Adicionar'}
        </button>
      </form>

      {/* Contribuicoes do mes */}
      {current.contributions.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Contribuicoes deste mes
          </div>
          <div className="rounded-lg border bg-white divide-y">
            {current.contributions.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="font-medium">
                    {brl(c.amount)}{' '}
                    {c.auto && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">
                        auto
                      </span>
                    )}
                  </div>
                  {c.note && <div className="text-xs text-gray-500">{c.note}</div>}
                  <div className="text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="text-red-600 text-xs hover:underline"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historico */}
      {history.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Ultimos meses
          </div>
          <div className="rounded-lg border bg-white divide-y">
            {history.map((h) => {
              const pct = h.target > 0 ? Math.min(100, (h.reserved / h.target) * 100) : 0;
              const ok = pct >= 100;
              return (
                <div key={`${h.year}-${h.month}`} className="p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {MESES[h.month - 1]} {h.year}
                    </span>
                    <span className={ok ? 'text-green-600' : 'text-gray-500'}>
                      {brl(h.reserved)} / {brl(h.target)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full ${ok ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
