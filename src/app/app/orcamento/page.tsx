'use client';

/**
 * Pagina de orcamento por categoria.
 *
 * Mostra cada orcamento como barra de progresso com cor por status,
 * sugere as top categorias sem orcamento e tem form pra criar/editar.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

type BudgetProgress = {
  id: string;
  category: string;
  monthlyLimit: number;
  alertThreshold: number;
  spent: number;
  remaining: number;
  percent: number;
  status: 'ok' | 'alert' | 'over';
};

type Suggestion = { category: string; spent: number };

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_STYLE: Record<BudgetProgress['status'], { bar: string; pill: string; label: string }> = {
  ok:    { bar: 'bg-green-500',  pill: 'bg-green-100 text-green-800',   label: 'No orcamento' },
  alert: { bar: 'bg-yellow-500', pill: 'bg-yellow-100 text-yellow-800', label: 'Atencao' },
  over:  { bar: 'bg-red-500',    pill: 'bg-red-100 text-red-800',       label: 'Estourou' },
};

export default function OrcamentoPage() {
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [category, setCategory] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/budgets');
      const d = await res.json();
      setBudgets(d.budgets ?? []);
      setSuggestions(d.suggestions ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setCategory('');
    setMonthlyLimit('');
    setAlertThreshold('80');
    setEditingId(null);
    setError(null);
  }

  function startEdit(b: BudgetProgress) {
    setEditingId(b.id);
    setCategory(b.category);
    setMonthlyLimit(String(b.monthlyLimit));
    setAlertThreshold(String(b.alertThreshold));
    setError(null);
  }

  function startFromSuggestion(s: Suggestion) {
    setEditingId(null);
    setCategory(s.category);
    // Sugere um limite 20% acima do gasto atual, arredondado pra dezena
    const sugg = Math.ceil((s.spent * 1.2) / 10) * 10;
    setMonthlyLimit(String(sugg));
    setAlertThreshold('80');
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const limit = parseFloat(monthlyLimit.replace(',', '.'));
    const threshold = parseInt(alertThreshold, 10);
    const cat = category.trim();

    if (!cat) return setError('Informe a categoria');
    if (!Number.isFinite(limit) || limit <= 0) return setError('Limite invalido');
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100) {
      return setError('Alerta deve estar entre 1 e 100');
    }

    setSaving(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: cat,
          monthlyLimit: limit,
          alertThreshold: threshold,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Erro ao salvar');
        return;
      }
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remover este orcamento?')) return;
    const res = await fetch(`/api/budgets?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) {
      if (editingId === id) resetForm();
      await load();
    }
  }

  return (
    <main className="flex-1 p-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/app" className="text-2xl">←</Link>
        <h1 className="text-xl font-bold">Orcamento por categoria</h1>
      </div>

      <p className="text-sm text-gray-600 mb-5">
        Defina um teto mensal de gasto por categoria. A barra fica amarela
        quando voce passa do limite de alerta e vermelha quando estoura.
      </p>

      {/* Lista */}
      {loading ? (
        <div className="text-gray-400">Carregando...</div>
      ) : budgets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500 mb-6">
          Voce ainda nao tem orcamentos. Use o formulario abaixo pra criar o primeiro.
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {budgets.map((b) => {
            const style = STATUS_STYLE[b.status];
            const widthPct = Math.min(100, b.percent);
            return (
              <div key={b.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold">{b.category}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${style.pill}`}>
                    {style.label}
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  {brl(b.spent)} de {brl(b.monthlyLimit)}{' '}
                  <span className="text-gray-500">
                    ({b.percent.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 rounded bg-gray-200 overflow-hidden mb-2">
                  <div
                    className={`h-full ${style.bar} transition-all`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {b.remaining >= 0
                      ? `Resta ${brl(b.remaining)}`
                      : `Estouro de ${brl(Math.abs(b.remaining))}`}
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(b.id)}
                      className="text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sugestoes */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Top categorias sem orcamento neste mes
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.category}
                type="button"
                onClick={() => startFromSuggestion(s)}
                className="text-sm rounded-full border border-gray-300 bg-gray-50 px-3 py-1 hover:bg-gray-100"
              >
                {s.category} <span className="text-gray-500">({brl(s.spent)})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={save} className="rounded-lg border bg-white p-4 space-y-3">
        <div className="font-semibold">
          {editingId ? 'Editar orcamento' : 'Novo orcamento'}
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Categoria</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!!editingId}
            placeholder="ex: alimentacao"
            className="w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Limite mensal (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="500"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Alerta em (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar orcamento'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border border-gray-300 px-4 py-2"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
