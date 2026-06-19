/**
 * Reserva de impostos.
 *
 * Para MEI: o DAS eh fixo (calcularDAS), entao a "meta" do mes eh esse
 * valor mesmo. Pro Simples Nacional: a meta eh um percentual da receita
 * do mes (default 8%, ajustavel pela usuaria).
 *
 * "Reservado" eh a soma das contribuicoes do mes corrente. "Faltando" eh
 * meta - reservado (nunca menor que 0).
 */
import { prisma } from './db';
import { calcularDAS } from './das';
import { calcularDASSimples, SimplesAnexo } from './simples';

const SIMPLES_DEFAULT_PERCENT = 8;

export type ReserveMonth = {
  year: number;
  month: number;
  target: number;       // valor estimado do imposto do mes
  reserved: number;     // ja separado
  remaining: number;    // quanto falta (>= 0)
  percent: number;      // reserved / target * 100 (cap 100)
  source: 'mei' | 'simples_calc' | 'simples_default' | 'nenhum';
  receitaMes: number;   // util pra exibir "X% da sua receita"
  contributions: ReserveContribution[];
};

export type ReserveContribution = {
  id: string;
  amount: number;
  note: string | null;
  auto: boolean;
  createdAt: Date;
};

/**
 * Soma a receita do mes (valor absoluto das transacoes type=receita).
 */
async function getReceitaMes(userId: string, year: number, month: number): Promise<number> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const agg = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'receita',
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });
  // amount de receita esta como negativo? Convencao do app eh positivo pra
  // entrada — mas usamos abs por seguranca.
  return Math.abs(agg._sum.amount ?? 0);
}

/**
 * Calcula a meta de reserva pro mes baseado no regime do usuario.
 */
export async function calcularMetaReserva(opts: {
  regime?: string | null;
  meiAtividade?: string | null;
  simplesAnexo?: string | null;
  taxReserveAutoPercent?: number | null;
  receitaMes: number;
  rbt12?: number;
}): Promise<{ target: number; source: ReserveMonth['source'] }> {
  const regime = opts.regime ?? 'mei';

  if (regime === 'mei') {
    return { target: calcularDAS(opts.meiAtividade), source: 'mei' };
  }

  if (regime === 'simples') {
    if (opts.simplesAnexo && opts.receitaMes > 0) {
      const calc = calcularDASSimples(
        opts.receitaMes,
        opts.rbt12 ?? 0,
        opts.simplesAnexo as SimplesAnexo,
      );
      return { target: calc.das, source: 'simples_calc' };
    }
    // Fallback: percentual flat sobre receita
    const pct = opts.taxReserveAutoPercent ?? SIMPLES_DEFAULT_PERCENT;
    return {
      target: opts.receitaMes * (pct / 100),
      source: 'simples_default',
    };
  }

  return { target: 0, source: 'nenhum' };
}

/**
 * Pega a soma de contribuicoes anteriores do ano pra estimar RBT12.
 * Usa receitas dos ultimos 12 meses ate (year, month - 1).
 */
async function getRbt12(userId: string, year: number, month: number): Promise<number> {
  // Janela: (year, month) - 12 meses ate (year, month) - 1
  const end = new Date(year, month - 1, 1);
  const start = new Date(year, month - 13, 1);

  const agg = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'receita',
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });
  return Math.abs(agg._sum.amount ?? 0);
}

/**
 * Status completo da reserva de um mes especifico.
 */
export async function getReserveMonth(
  userId: string,
  year: number,
  month: number,
): Promise<ReserveMonth> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      regime: true,
      meiAtividade: true,
      simplesAnexo: true,
      taxReserveAutoPercent: true,
    },
  });

  const [receitaMes, rbt12, contribs] = await Promise.all([
    getReceitaMes(userId, year, month),
    getRbt12(userId, year, month),
    prisma.taxReserve.findMany({
      where: { userId, year, month },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const { target, source } = await calcularMetaReserva({
    regime: user?.regime,
    meiAtividade: user?.meiAtividade,
    simplesAnexo: user?.simplesAnexo,
    taxReserveAutoPercent: user?.taxReserveAutoPercent,
    receitaMes,
    rbt12,
  });

  const reserved = contribs.reduce((s, c) => s + c.amount, 0);
  const remaining = Math.max(0, target - reserved);
  const percent = target > 0 ? Math.min(100, (reserved / target) * 100) : 0;

  return {
    year,
    month,
    target,
    reserved,
    remaining,
    percent,
    source,
    receitaMes,
    contributions: contribs.map((c) => ({
      id: c.id,
      amount: c.amount,
      note: c.note,
      auto: c.auto,
      createdAt: c.createdAt,
    })),
  };
}

/**
 * Historico dos ultimos N meses (default 6).
 */
export async function getReserveHistory(
  userId: string,
  count = 6,
): Promise<{ year: number; month: number; target: number; reserved: number }[]> {
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const result = [];
  for (const m of months) {
    const r = await getReserveMonth(userId, m.year, m.month);
    result.push({
      year: r.year,
      month: r.month,
      target: r.target,
      reserved: r.reserved,
    });
  }
  return result;
}
