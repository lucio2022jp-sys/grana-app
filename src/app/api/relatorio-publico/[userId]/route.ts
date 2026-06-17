import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Endpoint PUBLICO do relatorio - identifica o user pela URL,
 * nao pelo cookie. Usado pelo contador acessar via QR code/link compartilhado.
 *
 * Por seguranca: sem dados sensiveis tipo email do user, so o necessario
 * pra contabilidade (transacoes, totais, regime, contador).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const uid = params.userId;
  const url = new URL(req.url);
  const monthParam = url.searchParams.get('month');

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) {
    return NextResponse.json({ error: 'Cliente nao encontrado' }, { status: 404 });
  }

  // Lista de meses disponiveis (com transacao) - precisamos antes pra escolher default
  const allTxs = await prisma.transaction.findMany({
    where: { userId: uid },
    select: { date: true },
    orderBy: { date: 'desc' },
  });
  const mesesSet = new Set<string>();
  allTxs.forEach((t) => {
    mesesSet.add(`${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`);
  });
  const mesesDisponiveis = [...mesesSet].sort().reverse();

  // Default: mes mais recente com transacao. Fallback: mes atual.
  const now = new Date();
  let y: number;
  let m: number;
  if (monthParam) {
    [y, m] = monthParam.split('-').map(Number);
  } else if (mesesDisponiveis.length > 0) {
    [y, m] = mesesDisponiveis[0].split('-').map(Number);
  } else {
    y = now.getFullYear();
    m = now.getMonth() + 1;
  }

  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  const yearStart = new Date(y, 0, 1);
  const yearEnd = new Date(y + 1, 0, 1);

  // Transacoes do mes
  const txs = await prisma.transaction.findMany({
    where: { userId: uid, date: { gte: start, lt: end } },
    orderBy: { date: 'asc' },
  });

  // Receitas do ano (pra limite MEI)
  const yearReceita = await prisma.transaction.aggregate({
    where: { userId: uid, type: 'receita', date: { gte: yearStart, lt: yearEnd } },
    _sum: { amount: true },
  });

  // DAS pago no mes
  const dasPago = await prisma.dASPayment.findFirst({
    where: { userId: uid, year: y, month: m, paidAt: { not: null } },
  });

  // DAS proximo (a vencer)
  const proximoDAS = await prisma.dASPayment.findFirst({
    where: { userId: uid, paidAt: null },
    orderBy: { dueDate: 'asc' },
  });

  // Separa por tipo
  const receitas = txs.filter((t) => t.type === 'receita');
  const despesas = txs.filter((t) => t.type === 'despesa');
  const pessoais = txs.filter((t) => t.type === 'pessoal');
  const retiradas = txs.filter((t) => t.type === 'retirada');
  const investimentos = txs.filter((t) => t.type === 'investimento');
  const prolabore = txs.filter((t) => t.type === 'prolabore');

  const totalReceita = receitas.reduce((s, t) => s + t.amount, 0);
  const totalDespesa = despesas.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalPessoal = pessoais.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalRetirada = retiradas.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalProlabore = prolabore.reduce((s, t) => s + Math.abs(t.amount), 0);
  const lucroLiquido = totalReceita - totalDespesa - totalProlabore;

  // Top clientes
  const clienteMap = new Map<string, { total: number; count: number }>();
  receitas.forEach((t) => {
    const key = t.contraparte ?? t.description.slice(0, 40);
    const cur = clienteMap.get(key) ?? { total: 0, count: 0 };
    clienteMap.set(key, { total: cur.total + t.amount, count: cur.count + 1 });
  });
  const topClientes = [...clienteMap.entries()]
    .map(([nome, d]) => ({ nome, total: d.total, count: d.count }))
    .sort((a, b) => b.total - a.total);

  // Despesas por categoria
  const categMap = new Map<string, { total: number; count: number }>();
  despesas.forEach((t) => {
    const cur = categMap.get(t.category) ?? { total: 0, count: 0 };
    categMap.set(t.category, { total: cur.total + Math.abs(t.amount), count: cur.count + 1 });
  });
  const despesasPorCategoria = [...categMap.entries()]
    .map(([categoria, d]) => ({ categoria, total: d.total, count: d.count }))
    .sort((a, b) => b.total - a.total);

  const yearReceitaTotal = yearReceita._sum.amount ?? 0;
  const meiPercent = Math.min(100, Math.round((yearReceitaTotal / 81000) * 100));

  return NextResponse.json({
    user: {
      name: user.name,
      profissao: user.profissao,
      regime: user.regime,
      meiAtividade: user.meiAtividade,
      simplesAnexo: user.simplesAnexo,
      contadorNome: user.contadorNome,
    },
    period: {
      year: y,
      month: m,
      monthName: new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }),
    },
    mesesDisponiveis,
    totals: {
      receita: totalReceita,
      despesa: totalDespesa,
      pessoal: totalPessoal,
      retirada: totalRetirada,
      prolabore: totalProlabore,
      lucroLiquido,
    },
    counts: {
      total: txs.length,
      receitas: receitas.length,
      despesas: despesas.length,
      pessoais: pessoais.length,
      retiradas: retiradas.length,
    },
    receitas: receitas.map((t) => ({
      date: t.date,
      amount: t.amount,
      description: t.description,
      contraparte: t.contraparte,
    })),
    despesas: despesas.map((t) => ({
      date: t.date,
      amount: t.amount,
      description: t.description,
      contraparte: t.contraparte,
      category: t.category,
      isDeductible: t.isDeductible,
    })),
    retiradas: retiradas.map((t) => ({
      date: t.date,
      amount: t.amount,
      description: t.description,
      contraparte: t.contraparte,
    })),
    investimentos: investimentos.map((t) => ({
      date: t.date,
      amount: t.amount,
      description: t.description,
    })),
    topClientes,
    despesasPorCategoria,
    mei: {
      yearReceita: yearReceitaTotal,
      meiPercent,
      limite: 81000,
    },
    das: {
      pagoNoMes: dasPago ? {
        value: dasPago.value,
        paidAt: dasPago.paidAt,
        month: dasPago.month,
        year: dasPago.year,
      } : null,
      proximo: proximoDAS ? {
        value: proximoDAS.value,
        dueDate: proximoDAS.dueDate,
        month: proximoDAS.month,
        year: proximoDAS.year,
      } : null,
    },
    geradoEm: new Date().toISOString(),
  });
}
