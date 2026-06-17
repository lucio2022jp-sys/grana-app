import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * Metricas agregadas do classificador. Usado pra ajustar threshold da IA
 * e medir o quanto a heuristica esta acertando.
 *
 * Query params:
 *   - days: janela de tempo (default 30)
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 401 });
  }

  const url = new URL(req.url);
  const daysRaw = parseInt(url.searchParams.get('days') ?? '30', 10);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? daysRaw : 30;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.classificationMetric.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });

  // Memoria de correcao negativa: pares (sugestao IA -> correcao usuario)
  // que ja temos guardados pra alimentar o prompt da IA. Quanto mais, mais
  // contexto a IA tem pra evitar erros repetidos.
  const corrections = await prisma.classificationCorrection.findMany({
    where: { createdAt: { gte: since } },
    select: {
      userId: true,
      aiType: true,
      userType: true,
      aiCategory: true,
      userCategory: true,
    },
  });

  // Agrega
  const totals = rows.reduce(
    (acc, r) => {
      acc.uploads += 1;
      acc.totalTxs += r.totalTxs;
      acc.fromHistory += r.fromHistory;
      acc.fromHeuristic += r.fromHeuristic;
      acc.fromAI += r.fromAI;
      acc.aiCallsCount += r.aiCallsCount;
      acc.aiTxsCount += r.aiTxsCount;
      acc.correctedTxs += r.correctedTxs;
      return acc;
    },
    {
      uploads: 0,
      totalTxs: 0,
      fromHistory: 0,
      fromHeuristic: 0,
      fromAI: 0,
      aiCallsCount: 0,
      aiTxsCount: 0,
      correctedTxs: 0,
    },
  );

  const pct = (n: number) => (totals.totalTxs > 0 ? (n / totals.totalTxs) * 100 : 0);

  // Top transicoes do tipo (ai -> user) — mostra os erros mais frequentes da IA.
  const transicoes = new Map<string, number>();
  for (const c of corrections) {
    if (c.aiType === c.userType && c.aiCategory === c.userCategory) continue;
    const chave = `${c.aiType}/${c.aiCategory} → ${c.userType}/${c.userCategory}`;
    transicoes.set(chave, (transicoes.get(chave) ?? 0) + 1);
  }
  const topTransicoes = [...transicoes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const usuariosCorrigindo = new Set(corrections.map((c) => c.userId)).size;

  const summary = {
    days,
    uploads: totals.uploads,
    totalTxs: totals.totalTxs,
    breakdown: {
      history: { count: totals.fromHistory, pct: pct(totals.fromHistory) },
      heuristic: { count: totals.fromHeuristic, pct: pct(totals.fromHeuristic) },
      ai: { count: totals.fromAI, pct: pct(totals.fromAI) },
    },
    ai: {
      calls: totals.aiCallsCount,
      txs: totals.aiTxsCount,
      avgBatchSize: totals.aiCallsCount > 0 ? totals.aiTxsCount / totals.aiCallsCount : 0,
    },
    corrections: {
      count: totals.correctedTxs,
      // taxa de correcao sobre total classificado
      pct: pct(totals.correctedTxs),
    },
    memoria: {
      pares: corrections.length,
      usuariosAtivos: usuariosCorrigindo,
      topTransicoes,
    },
  };

  // Serie diaria pra grafico
  const byDay = new Map<string, { date: string; total: number; ai: number; corrected: number }>();
  for (const r of rows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? { date: key, total: 0, ai: 0, corrected: 0 };
    cur.total += r.totalTxs;
    cur.ai += r.fromAI;
    cur.corrected += r.correctedTxs;
    byDay.set(key, cur);
  }
  const series = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ summary, series });
}
