/**
 * Calculo de orcamento por categoria.
 *
 * "Gasto" pra fins de orcamento = soma das transacoes do mes onde
 *   - type === 'despesa' (gasto do trabalho), OU
 *   - type === 'pessoal' (gasto pessoal)
 * agrupadas pela mesma category.
 *
 * amount em despesas eh negativo no banco; trabalhamos com valor
 * absoluto pra exibir gasto positivo.
 */
import { prisma } from './db';

export interface BudgetProgress {
  id: string;
  category: string;
  monthlyLimit: number;
  alertThreshold: number;
  spent: number;       // valor absoluto do que ja foi gasto no mes
  remaining: number;   // monthlyLimit - spent (pode ser negativo se passou)
  percent: number;     // 0-100+ (pode passar de 100)
  status: 'ok' | 'alert' | 'over';
}

/**
 * Tipos de transacao que contam como "gasto" pro orcamento.
 * Pro-labore e retirada nao entram porque nao sao consumo no sentido orcamentario.
 */
const SPENDING_TYPES = ['despesa', 'pessoal'] as const;

export function getMonthBounds(ref: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  return { start, end };
}

/**
 * Calcula progresso de todos os orcamentos do usuario pro mes atual.
 */
export async function getBudgetsProgress(
  userId: string,
  ref: Date = new Date(),
): Promise<BudgetProgress[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    orderBy: { category: 'asc' },
  });

  if (budgets.length === 0) return [];

  const { start, end } = getMonthBounds(ref);

  // Soma gasto por categoria de uma vez so
  const grouped = await prisma.transaction.groupBy({
    by: ['category'],
    where: {
      userId,
      type: { in: [...SPENDING_TYPES] },
      date: { gte: start, lt: end },
      category: { in: budgets.map((b) => b.category) },
    },
    _sum: { amount: true },
  });

  const spentMap = new Map<string, number>();
  for (const row of grouped) {
    spentMap.set(row.category, Math.abs(row._sum.amount ?? 0));
  }

  return budgets.map((b) => {
    const spent = spentMap.get(b.category) ?? 0;
    const remaining = b.monthlyLimit - spent;
    const percent = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
    const status: BudgetProgress['status'] =
      percent >= 100 ? 'over' : percent >= b.alertThreshold ? 'alert' : 'ok';

    return {
      id: b.id,
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      alertThreshold: b.alertThreshold,
      spent,
      remaining,
      percent,
      status,
    };
  });
}

/**
 * Top categorias gastas no mes (independente de ter orcamento), pra UI
 * sugerir quais o usuario poderia querer orcar.
 */
export async function getTopCategoriesNoBudget(
  userId: string,
  ref: Date = new Date(),
  limit = 5,
): Promise<{ category: string; spent: number }[]> {
  const { start, end } = getMonthBounds(ref);

  const budgeted = await prisma.budget.findMany({
    where: { userId },
    select: { category: true },
  });
  const budgetedSet = new Set(budgeted.map((b) => b.category));

  const grouped = await prisma.transaction.groupBy({
    by: ['category'],
    where: {
      userId,
      type: { in: [...SPENDING_TYPES] },
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });

  return grouped
    .map((g) => ({ category: g.category, spent: Math.abs(g._sum.amount ?? 0) }))
    .filter((g) => g.category && !budgetedSet.has(g.category))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, limit);
}
