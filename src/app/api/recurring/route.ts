import { NextRequest, NextResponse } from 'next/server';
import { getUserCookieName } from '@/lib/session';
import { detectarRecorrentes, marcarRecorrentes } from '@/lib/recurring';

/**
 * Lista pagamentos/recebimentos recorrentes detectados.
 */
export async function GET(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ groups: [], totals: { receita: 0, despesa: 0 } });

  const grupos = await detectarRecorrentes(uid);

  const totals = grupos.reduce(
    (acc, g) => {
      if (g.type === 'receita') acc.receita += g.valorMedio;
      else acc.despesa += Math.abs(g.valorMedio);
      return acc;
    },
    { receita: 0, despesa: 0 },
  );

  return NextResponse.json({
    groups: grupos.map((g) => ({
      key: g.key,
      contraparte: g.contraparte,
      valorMedio: g.valorMedio,
      type: g.type,
      category: g.category,
      occurrences: g.occurrences,
      monthsActive: g.monthsActive,
      intervalMedio: g.intervalMedio,
      ultimaData: g.ultimaData,
      proximaPrevista: g.proximaPrevista,
      transactionIds: g.transactionIds,
    })),
    totals,
    count: grupos.length,
  });
}

/**
 * Re-roda a deteccao manualmente.
 */
export async function POST(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const count = await marcarRecorrentes(uid);
  return NextResponse.json({ marked: count });
}
