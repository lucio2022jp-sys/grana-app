import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * Funil de aquisicao: signups, trials ativos, conversao trial→pago,
 * MRR estimado e churn. Tudo derivado das colunas que o modelo User
 * ja tem (createdAt, trialEndsAt, plan, stripeSubscriptionId, planUntil).
 *
 * Query params:
 *   - days: janela de tempo (default 30)
 *
 * Preco Pro: R$ 17,90/mes. Hardcode aqui porque o Stripe nao tem essa
 * info localmente. Se mudar o preco, atualiza PRECO_PRO_MENSAL.
 */

const PRECO_PRO_MENSAL = 17.9;

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 401 });
  }

  const url = new URL(req.url);
  const daysRaw = parseInt(url.searchParams.get('days') ?? '30', 10);
  const days =
    Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? daysRaw : 30;

  const agora = new Date();
  const since = new Date(agora.getTime() - days * 24 * 60 * 60 * 1000);

  // Pega todos os usuarios criados na janela + os que ainda tao pagantes
  // (mesmo que criados antes da janela, pra MRR/ativos atuais).
  const usuariosJanela = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      createdAt: true,
      plan: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      planUntil: true,
    },
  });

  // Pra MRR/ativos, conta todos os pagantes (independente da janela).
  const pagantesAtivos = await prisma.user.count({
    where: {
      plan: 'pro',
      OR: [{ planUntil: null }, { planUntil: { gt: agora } }],
    },
  });

  // Trial ativos (qualquer um cujo trialEndsAt eh no futuro)
  const trialAtivos = await prisma.user.count({
    where: { trialEndsAt: { gt: agora } },
  });

  // Conversao na janela: dentro dos criados, quantos viraram pro
  // (independente de trial ter expirado ja ou nao)
  const signups = usuariosJanela.length;
  const converteramNaJanela = usuariosJanela.filter(
    (u) => u.plan === 'pro' && u.stripeSubscriptionId,
  ).length;

  // Trial expirado sem converter (na janela)
  const trialExpirouSemConverter = usuariosJanela.filter((u) => {
    if (!u.trialEndsAt) return false;
    if (u.trialEndsAt > agora) return false;
    return u.plan !== 'pro';
  }).length;

  // Churned: tinha sub no Stripe mas planUntil ja passou e nao renovou
  const churned = await prisma.user.count({
    where: {
      stripeSubscriptionId: { not: null },
      planUntil: { lt: agora, gte: since },
      plan: { not: 'pro' },
    },
  });

  const mrr = pagantesAtivos * PRECO_PRO_MENSAL;

  // Serie diaria de signups
  const byDay = new Map<string, { date: string; signups: number; pagos: number }>();
  // Inicializa todos os dias com zero pra grafico contiguo
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, signups: 0, pagos: 0 });
  }
  for (const u of usuariosJanela) {
    const key = u.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key);
    if (!cur) continue;
    cur.signups += 1;
    if (u.plan === 'pro' && u.stripeSubscriptionId) cur.pagos += 1;
  }
  const series = Array.from(byDay.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const summary = {
    days,
    signups,
    trialAtivos,
    converteramNaJanela,
    trialExpirouSemConverter,
    taxaConversao:
      signups > 0 ? (converteramNaJanela / signups) * 100 : 0,
    pagantesAtivos,
    mrr,
    churned,
    taxaChurn:
      pagantesAtivos + churned > 0
        ? (churned / (pagantesAtivos + churned)) * 100
        : 0,
    precoPro: PRECO_PRO_MENSAL,
  };

  return NextResponse.json({ summary, series });
}
