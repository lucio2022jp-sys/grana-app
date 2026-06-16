import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Calcula score de mistura PF/PJ.
 *
 * Logica:
 *  - Saidas totais do mes = despesas + pessoais + retiradas
 *  - Score = % gastos pessoais sobre total de saidas
 *  - Niveis:
 *      verde  (saudavel): < 10% pessoal
 *      amarelo (atencao):  10-30% pessoal
 *      vermelho (risco):   > 30% pessoal
 *
 *  - Se < 5 transacoes no mes, score nao e relevante.
 */

export type Nivel = 'saudavel' | 'atencao' | 'risco' | 'sem_dados';

export async function GET(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ nivel: 'sem_dados', percentPessoal: 0 });

  const url = new URL(req.url);
  const monthParam = url.searchParams.get('month');
  const now = new Date();
  const [y, m] = monthParam
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const monthTxs = await prisma.transaction.findMany({
    where: { userId: uid, date: { gte: start, lt: end } },
  });

  let totalDespesas = 0;
  let totalPessoal = 0;
  let totalRetiradas = 0;
  const pessoaisDestacadas: any[] = [];

  for (const tx of monthTxs) {
    const v = Math.abs(tx.amount);
    if (tx.type === 'despesa') totalDespesas += v;
    else if (tx.type === 'pessoal') {
      totalPessoal += v;
      pessoaisDestacadas.push({
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        description: tx.description,
        contraparte: tx.contraparte,
        category: tx.category,
      });
    } else if (tx.type === 'retirada') totalRetiradas += v;
  }

  const totalSaidas = totalDespesas + totalPessoal + totalRetiradas;

  // Pessoal direto na conta da empresa e o pior caso (nao confunda com retirada,
  // que e legitima). O score considera so o "pessoal" sobre total de saidas.
  const percentPessoal = totalSaidas > 0
    ? Math.round((totalPessoal / totalSaidas) * 100)
    : 0;

  let nivel: Nivel = 'sem_dados';
  if (monthTxs.length < 5) {
    nivel = 'sem_dados';
  } else if (percentPessoal < 10) {
    nivel = 'saudavel';
  } else if (percentPessoal < 30) {
    nivel = 'atencao';
  } else {
    nivel = 'risco';
  }

  // Pega top 5 pessoais mais altos pra destacar
  const topPessoais = pessoaisDestacadas
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5);

  return NextResponse.json({
    nivel,
    percentPessoal,
    totalDespesas,
    totalPessoal,
    totalRetiradas,
    totalSaidas,
    countPessoais: pessoaisDestacadas.length,
    topPessoais,
    txCount: monthTxs.length,
    month: `${y}-${String(m).padStart(2, '0')}`,
  });
}
