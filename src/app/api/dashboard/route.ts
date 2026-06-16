import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';

const MEI_LIMIT = 81000;

export async function GET(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) {
    return NextResponse.json({
      empty: true,
      receita: 0,
      despesas: 0,
      pessoal: 0,
      sobrou: 0,
      retiradas: 0,
      investimentos: 0,
      emprestimos: 0,
      prolabore: 0,
      reembolsos: 0,
      meiPercent: 0,
      topClientes: [],
      topDespesas: [],
    });
  }

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

  const monthTxs = await prisma.transaction.findMany({
    where: { userId: uid, date: { gte: start, lt: end } },
  });

  // So receita pura conta pro limite MEI (faturamento bruto)
  const yearReceitas = await prisma.transaction.aggregate({
    where: { userId: uid, type: 'receita', date: { gte: yearStart, lt: yearEnd } },
    _sum: { amount: true },
  });

  let receita = 0;
  let despesas = 0;
  let pessoal = 0;
  let retiradas = 0;
  let investimentos = 0;
  let emprestimos = 0;
  let prolabore = 0;
  let reembolsos = 0;

  for (const tx of monthTxs) {
    const v = Math.abs(tx.amount);
    switch (tx.type) {
      case 'receita':
        receita += tx.amount; // mantem sinal pra suportar valores negativos eventuais
        break;
      case 'despesa':
        despesas += v;
        break;
      case 'pessoal':
        pessoal += v;
        break;
      case 'retirada':
        retiradas += v;
        break;
      case 'investimento':
        investimentos += v;
        break;
      case 'emprestimo':
        emprestimos += v;
        break;
      case 'prolabore':
        prolabore += v;
        break;
      case 'reembolso':
        // reembolso entra no lucro com o sinal correto
        reembolsos += tx.amount;
        break;
      case 'transferencia':
        // ignorado no calculo de lucro
        break;
      default:
        // Compatibilidade: se tem isDeductible mas type sem mapeamento, conta como despesa
        if (tx.isDeductible) despesas += v;
        else if (tx.isPersonal) pessoal += v;
    }
  }

  // Lucro liquido do mes:
  //  = receita - despesa - prolabore + reembolso
  //  Pessoal nao entra no lucro (é gasto pessoal pago com a conta).
  //  Retirada, investimento e emprestimo nao entram no lucro.
  const sobrou = receita - despesas - prolabore + reembolsos;

  const yearReceita = yearReceitas._sum.amount ?? 0;
  const meiPercent = Math.min(100, Math.round((yearReceita / MEI_LIMIT) * 100));

  // Top clientes (por contraparte das receitas)
  const clienteMap = new Map<string, number>();
  monthTxs
    .filter((t) => t.type === 'receita')
    .forEach((t) => {
      const key = t.contraparte ?? t.description.slice(0, 40);
      clienteMap.set(key, (clienteMap.get(key) ?? 0) + t.amount);
    });
  const topClientes = Array.from(clienteMap.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top despesas (categoria) - so despesas reais
  const despesaMap = new Map<string, number>();
  monthTxs
    .filter((t) => t.type === 'despesa')
    .forEach((t) => {
      despesaMap.set(t.category, (despesaMap.get(t.category) ?? 0) + Math.abs(t.amount));
    });
  const topDespesas = Array.from(despesaMap.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return NextResponse.json({
    empty: monthTxs.length === 0,
    month: `${y}-${String(m).padStart(2, '0')}`,
    receita,
    despesas,
    pessoal,
    retiradas,
    investimentos,
    emprestimos,
    prolabore,
    reembolsos,
    sobrou,
    meiLimit: MEI_LIMIT,
    yearReceita,
    meiPercent,
    txCount: monthTxs.length,
    topClientes,
    topDespesas,
  });
}
