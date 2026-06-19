/**
 * Lista as receitas que ainda nao tem nota fiscal emitida
 * (notaNumero vazio). Usado pra montar a fila "📋 Notas a emitir"
 * e pra alimentar o card de pendencias no dashboard.
 *
 * Estrategia: pega receitas dos ultimos 90 dias sem notaNumero,
 * ordenadas da mais recente pra mais antiga. Inclui total agregado
 * pra exibicao no dashboard sem 2 chamadas.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

const JANELA_DIAS = 90;

export async function GET(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) {
    return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });
  }

  const desde = new Date();
  desde.setDate(desde.getDate() - JANELA_DIAS);

  const txs = await prisma.transaction.findMany({
    where: {
      userId: uid,
      type: 'receita',
      date: { gte: desde },
      OR: [{ notaNumero: null }, { notaNumero: '' }],
    },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      date: true,
      amount: true,
      description: true,
      contraparte: true,
      contraparteDoc: true,
      category: true,
      notes: true,
    },
  });

  const total = txs.reduce((acc, t) => acc + t.amount, 0);

  // Quantas estao "atrasadas" (>7 dias sem emitir): util pra mostrar
  // urgencia na lista. MEI nao tem prazo legal pra emitir NFS-e
  // (depende da prefeitura), mas 7 dias e o senso comum.
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const atrasadas = txs.filter((t) => t.date < seteDiasAtras).length;

  return NextResponse.json({
    pendentes: txs,
    total,
    count: txs.length,
    atrasadas,
    janelaDias: JANELA_DIAS,
  });
}
