import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Retorna TODOS os dados necessarios pra montar o relatorio mensal.
 * Usado pela tela de relatorios pra gerar o PDF.
 */
export async function GET(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const url = new URL(req.url);
  const monthParam = url.searchParams.get('month');
  const now = new Date();
  const [y, m] = monthParam
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  const yearStart = new Date(y, 0, 1);
  const yearEnd = new Date(y + 1, 0, 1);

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: 'User nao encontrado' }, { status: 404 });

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
  const emprestimos = txs.filter((t) => t.type === 'emprestimo');
  const transferencias = txs.filter((t) => t.type === 'transferencia');
  const reembolsos = txs.filter((t) => t.type === 'reembolso');
  const prolabore = txs.filter((t) => t.type === 'prolabore');

  // Totais
  const totalReceita = receitas.reduce((s, t) => s + t.amount, 0);
  const totalDespesa = despesas.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalPessoal = pessoais.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalRetirada = retiradas.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalInvestimento = investimentos.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalEmprestimo = emprestimos.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalReembolso = reembolsos.reduce((s, t) => s + t.amount, 0);
  const totalProlabore = prolabore.reduce((s, t) => s + Math.abs(t.amount), 0);

  const lucroLiquido = totalReceita - totalDespesa - totalProlabore + totalReembolso;

  // Top clientes (consolidado por contraparte)
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

  // Limite MEI
  const yearReceitaTotal = yearReceita._sum.amount ?? 0;
  const meiPercent = Math.min(100, Math.round((yearReceitaTotal / 81000) * 100));

  // Saude PF/PJ
  const totalSaidas = totalDespesa + totalPessoal + totalRetirada;
  const percentPessoal = totalSaidas > 0
    ? Math.round((totalPessoal / totalSaidas) * 100)
    : 0;
  let saudeNivel: 'saudavel' | 'atencao' | 'risco' | 'sem_dados' = 'sem_dados';
  if (txs.length >= 5) {
    if (percentPessoal < 10) saudeNivel = 'saudavel';
    else if (percentPessoal < 30) saudeNivel = 'atencao';
    else saudeNivel = 'risco';
  }

  return NextResponse.json({
    user: {
      name: user.name,
      profissao: user.profissao,
      regime: user.regime,
      meiAtividade: user.meiAtividade,
      simplesAnexo: user.simplesAnexo,
    },
    period: {
      year: y,
      month: m,
      monthName: new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }),
    },
    totals: {
      receita: totalReceita,
      despesa: totalDespesa,
      pessoal: totalPessoal,
      retirada: totalRetirada,
      investimento: totalInvestimento,
      emprestimo: totalEmprestimo,
      reembolso: totalReembolso,
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
    pessoais: pessoais.map((t) => ({
      date: t.date,
      amount: t.amount,
      description: t.description,
      contraparte: t.contraparte,
      category: t.category,
    })),
    investimentos: investimentos.map((t) => ({
      date: t.date,
      amount: t.amount,
      description: t.description,
    })),
    emprestimos: emprestimos.map((t) => ({
      date: t.date,
      amount: t.amount,
      description: t.description,
    })),
    transferencias: transferencias.map((t) => ({
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
    saude: {
      nivel: saudeNivel,
      percentPessoal,
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
