/**
 * Coleta dados do banco e gera o PDF de relatorio mensal.
 * Funciona tanto chamado do client (rota /api/relatorio + jsPDF no browser)
 * quanto server (cron, /api/relatorios-salvos). Aqui e a versao server:
 * roda em Node, retorna Buffer com o PDF.
 */

import { prisma } from '@/lib/db';
import { gerarRelatorioPDF, type RelatorioData } from '@/lib/report-pdf';

export type RelatorioTotaisMensais = {
  receita: number;
  despesas: number;
  lucro: number;
  txCount: number;
};

/**
 * Coleta os dados e retorna o objeto que o PDF builder espera.
 * Lanca se o user nao existe.
 */
export async function coletarDadosRelatorio(
  userId: string,
  year: number,
  month: number,
): Promise<RelatorioData> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User nao encontrado');

  const txs = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    orderBy: { date: 'asc' },
  });

  const yearReceita = await prisma.transaction.aggregate({
    where: { userId, type: 'receita', date: { gte: yearStart, lt: yearEnd } },
    _sum: { amount: true },
  });

  const dasPago = await prisma.dASPayment.findFirst({
    where: { userId, year, month, paidAt: { not: null } },
  });

  const proximoDAS = await prisma.dASPayment.findFirst({
    where: { userId, paidAt: null },
    orderBy: { dueDate: 'asc' },
  });

  const receitas = txs.filter((t) => t.type === 'receita');
  const despesas = txs.filter((t) => t.type === 'despesa');
  const pessoais = txs.filter((t) => t.type === 'pessoal');
  const retiradas = txs.filter((t) => t.type === 'retirada');
  const investimentos = txs.filter((t) => t.type === 'investimento');
  const emprestimos = txs.filter((t) => t.type === 'emprestimo');
  const transferencias = txs.filter((t) => t.type === 'transferencia');
  const reembolsos = txs.filter((t) => t.type === 'reembolso');
  const prolabore = txs.filter((t) => t.type === 'prolabore');

  const totalReceita = receitas.reduce((s, t) => s + t.amount, 0);
  const totalDespesa = despesas.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalPessoal = pessoais.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalRetirada = retiradas.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalInvestimento = investimentos.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalEmprestimo = emprestimos.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalReembolso = reembolsos.reduce((s, t) => s + t.amount, 0);
  const totalProlabore = prolabore.reduce((s, t) => s + Math.abs(t.amount), 0);

  const lucroLiquido = totalReceita - totalDespesa - totalProlabore + totalReembolso;

  const clienteMap = new Map<string, { total: number; count: number }>();
  receitas.forEach((t) => {
    const key = t.contraparte ?? t.description.slice(0, 40);
    const cur = clienteMap.get(key) ?? { total: 0, count: 0 };
    clienteMap.set(key, { total: cur.total + t.amount, count: cur.count + 1 });
  });
  const topClientes = [...clienteMap.entries()]
    .map(([nome, d]) => ({ nome, total: d.total, count: d.count }))
    .sort((a, b) => b.total - a.total);

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

  return {
    user: {
      name: user.name,
      profissao: user.profissao,
      regime: user.regime,
      meiAtividade: user.meiAtividade,
      simplesAnexo: user.simplesAnexo,
    },
    period: {
      year,
      month,
      monthName: new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }),
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
  };
}

/**
 * Gera o PDF do relatorio mensal e retorna o Buffer.
 * Tambem retorna os totais pra salvar no snapshot do banco.
 */
export async function gerarRelatorioBuffer(
  userId: string,
  year: number,
  month: number,
): Promise<{ buffer: Buffer; totais: RelatorioTotaisMensais }> {
  const data = await coletarDadosRelatorio(userId, year, month);
  const doc = gerarRelatorioPDF(data);

  // jsPDF.output('arraybuffer') funciona no Node (versao recente).
  const ab = doc.output('arraybuffer') as ArrayBuffer;
  const buffer = Buffer.from(ab);

  return {
    buffer,
    totais: {
      receita: data.totals.receita,
      despesas: data.totals.despesa,
      lucro: data.totals.lucroLiquido,
      txCount: data.counts.total,
    },
  };
}
