/**
 * Billing & cota mensal de lançamentos.
 *
 * Estratégia:
 *  - Plano Free: 20 lançamentos NOVOS por mês (manuais). Importação inicial
 *    do extrato (imported=true) e tx automáticas (DAS) NÃO contam.
 *  - Plano Pro: ilimitado.
 *  - Toda conta nova ganha 7 dias de trial Pro automático.
 *  - Durante o trial, isPro() = true mesmo no plan='free'.
 *
 * O contador `monthlyNewTxCount` é resetado lazy: na primeira chamada
 * do mês, se `monthlyNewTxResetAt` está em mês anterior, zera e atualiza.
 */
import { prisma } from '@/lib/db';

export const FREE_MONTHLY_LIMIT = 20;
export const TRIAL_DAYS = 7;

export type PlanStatus = {
  plan: 'free' | 'pro';
  isPro: boolean;
  trialActive: boolean;
  trialEndsAt: Date | null;
  trialDaysLeft: number; // 0 se nao em trial
  monthlyNewTxCount: number;
  monthlyNewTxLimit: number; // FREE_MONTHLY_LIMIT pra free, Infinity pra pro
  monthlyNewTxRemaining: number; // Infinity pra pro
};

type UserBillingFields = {
  plan: string;
  trialEndsAt: Date | null;
  monthlyNewTxCount: number;
  monthlyNewTxResetAt: Date;
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Faz reset lazy do contador mensal se necessário. Retorna o user com
 * os campos de billing atualizados em memória (e no banco, se mudou).
 */
async function ensureMonthlyReset(
  userId: string,
  user: UserBillingFields,
): Promise<UserBillingFields> {
  const now = new Date();
  const nowMonthStart = startOfMonth(now);
  const lastResetMonthStart = startOfMonth(user.monthlyNewTxResetAt);

  if (nowMonthStart.getTime() > lastResetMonthStart.getTime()) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyNewTxCount: 0,
        monthlyNewTxResetAt: nowMonthStart,
      },
    });
    return {
      ...user,
      monthlyNewTxCount: 0,
      monthlyNewTxResetAt: nowMonthStart,
    };
  }
  return user;
}

/**
 * Busca status completo do plano do usuário. Faz reset lazy do contador
 * mensal se virou o mês desde o último uso.
 */
export async function getPlanStatus(userId: string): Promise<PlanStatus> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      trialEndsAt: true,
      monthlyNewTxCount: true,
      monthlyNewTxResetAt: true,
    },
  });
  if (!u) {
    // Sem user = trata como free zerado. Nao deve acontecer no fluxo normal.
    return {
      plan: 'free',
      isPro: false,
      trialActive: false,
      trialEndsAt: null,
      trialDaysLeft: 0,
      monthlyNewTxCount: 0,
      monthlyNewTxLimit: FREE_MONTHLY_LIMIT,
      monthlyNewTxRemaining: FREE_MONTHLY_LIMIT,
    };
  }

  const fresh = await ensureMonthlyReset(userId, u);

  const now = new Date();
  const trialActive =
    !!fresh.trialEndsAt && fresh.trialEndsAt.getTime() > now.getTime();
  const trialDaysLeft = trialActive
    ? Math.max(
        0,
        Math.ceil((fresh.trialEndsAt!.getTime() - now.getTime()) / 86_400_000),
      )
    : 0;

  const isPro = fresh.plan === 'pro' || trialActive;
  const limit = isPro ? Infinity : FREE_MONTHLY_LIMIT;
  const remaining = isPro
    ? Infinity
    : Math.max(0, FREE_MONTHLY_LIMIT - fresh.monthlyNewTxCount);

  return {
    plan: fresh.plan === 'pro' ? 'pro' : 'free',
    isPro,
    trialActive,
    trialEndsAt: fresh.trialEndsAt,
    trialDaysLeft,
    monthlyNewTxCount: fresh.monthlyNewTxCount,
    monthlyNewTxLimit: limit,
    monthlyNewTxRemaining: remaining,
  };
}

export type CanCreateResult =
  | { ok: true; status: PlanStatus }
  | { ok: false; reason: 'limit_reached'; status: PlanStatus };

/**
 * Verifica se o usuário pode criar mais um lançamento manual.
 */
export async function canCreateNewTransaction(
  userId: string,
): Promise<CanCreateResult> {
  const status = await getPlanStatus(userId);
  if (status.isPro) return { ok: true, status };
  if (status.monthlyNewTxRemaining <= 0) {
    return { ok: false, reason: 'limit_reached', status };
  }
  return { ok: true, status };
}

/**
 * Incrementa o contador mensal. Chamar APÓS criar a transação manual com
 * sucesso. Não passar nada se imported=true ou se for tx automática.
 *
 * Race condition: se duas requisições simultâneas passarem do gate ao
 * mesmo tempo, ambas incrementam — pode estourar 1-2 acima do limite.
 * Aceitável pra V1 sem locking pessimista.
 */
export async function consumeTransactionQuota(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { monthlyNewTxCount: { increment: 1 } },
  });
}

/**
 * Garante trial de 7 dias em uma conta recém-criada. Chamar logo após
 * criar o User. Idempotente: só seta se trialEndsAt está null.
 */
export async function ensureTrialOnNewUser(userId: string): Promise<void> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { trialEndsAt: true, createdAt: true },
  });
  if (!u || u.trialEndsAt) return;
  const ends = new Date(u.createdAt.getTime() + TRIAL_DAYS * 86_400_000);
  await prisma.user.update({
    where: { id: userId },
    data: { trialEndsAt: ends },
  });
}
