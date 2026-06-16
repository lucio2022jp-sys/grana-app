import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/evolucao?meses=6
 *
 * Retorna agregado mensal dos ultimos N meses (default 6, max 24):
 *  - receita, despesa, lucro liquido (mesma formula do dashboard)
 *  - tendencia: % de variacao do mes atual vs media dos anteriores
 *
 * Lucro = receita - despesa - prolabore + reembolso (igual a dashboard).
 */
const MESES_DEFAULT = 6;
const MESES_MAX = 24;

type MesAgregado = {
  mes: string;        // "2026-06"
  label: string;      // "Jun"
  receita: number;
  despesa: number;
  lucro: number;
  txCount: number;
};

export async function GET(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;

  const url = new URL(req.url);
  const mesesParam = parseInt(url.searchParams.get('meses') ?? '', 10);
  const meses = Math.min(
    MESES_MAX,
    Math.max(1, Number.isFinite(mesesParam) ? mesesParam : MESES_DEFAULT),
  );

  if (!uid) {
    return NextResponse.json({
      empty: true,
      meses: [],
      tendencia: null,
    });
  }

  const now = new Date();
  const ate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // primeiro dia do proximo mes
  const desde = new Date(now.getFullYear(), now.getMonth() - (meses - 1), 1);

  const txs = await prisma.transaction.findMany({
    where: { userId: uid, date: { gte: desde, lt: ate } },
    select: {
      date: true,
      amount: true,
      type: true,
      isDeductible: true,
      isPersonal: true,
    },
  });

  // Inicializa array com todos os meses (mesmo que vazios)
  const buckets: MesAgregado[] = [];
  for (let i = 0; i < meses; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (meses - 1 - i), 1);
    buckets.push({
      mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      receita: 0,
      despesa: 0,
      lucro: 0,
      txCount: 0,
    });
  }

  const indexMap = new Map(buckets.map((b, i) => [b.mes, i]));

  for (const tx of txs) {
    const d = tx.date;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const idx = indexMap.get(key);
    if (idx === undefined) continue;
    const b = buckets[idx];
    const v = Math.abs(tx.amount);
    b.txCount++;

    switch (tx.type) {
      case 'receita':
        b.receita += tx.amount;
        b.lucro += tx.amount;
        break;
      case 'despesa':
        b.despesa += v;
        b.lucro -= v;
        break;
      case 'prolabore':
        b.lucro -= v;
        break;
      case 'reembolso':
        b.lucro += tx.amount;
        break;
      // pessoal, retirada, investimento, emprestimo, transferencia: ignorados
      default:
        if (tx.isDeductible) {
          b.despesa += v;
          b.lucro -= v;
        }
    }
  }

  // Tendencia: compara mes atual com media dos anteriores
  let tendencia: {
    receitaPct: number | null;
    despesaPct: number | null;
    lucroPct: number | null;
    direcao: 'subindo' | 'descendo' | 'estavel' | 'sem_dados';
  } | null = null;

  const atual = buckets[buckets.length - 1];
  const anteriores = buckets.slice(0, -1).filter((b) => b.txCount > 0);

  if (anteriores.length > 0 && atual.txCount > 0) {
    const mediaReceita = anteriores.reduce((s, b) => s + b.receita, 0) / anteriores.length;
    const mediaDespesa = anteriores.reduce((s, b) => s + b.despesa, 0) / anteriores.length;
    const mediaLucro = anteriores.reduce((s, b) => s + b.lucro, 0) / anteriores.length;

    const pct = (atual: number, media: number) =>
      media === 0 ? null : Math.round(((atual - media) / Math.abs(media)) * 100);

    const receitaPct = pct(atual.receita, mediaReceita);
    const despesaPct = pct(atual.despesa, mediaDespesa);
    const lucroPct = pct(atual.lucro, mediaLucro);

    let direcao: 'subindo' | 'descendo' | 'estavel' = 'estavel';
    if (lucroPct !== null) {
      if (lucroPct >= 10) direcao = 'subindo';
      else if (lucroPct <= -10) direcao = 'descendo';
    }

    tendencia = { receitaPct, despesaPct, lucroPct, direcao };
  } else {
    tendencia = {
      receitaPct: null,
      despesaPct: null,
      lucroPct: null,
      direcao: 'sem_dados',
    };
  }

  return NextResponse.json({
    empty: txs.length === 0,
    meses: buckets,
    tendencia,
  });
}
