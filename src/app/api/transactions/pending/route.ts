import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Lista transacoes que precisam de revisao manual.
 * Sao as que vieram de PDF/share e ainda nao foram confirmadas pelo usuario.
 */
export async function GET(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) {
    return NextResponse.json({ pending: [], count: 0 });
  }

  const pending = await prisma.transaction.findMany({
    where: {
      userId: uid,
      userConfirmed: false,
      // So o que veio de import automatico (manual ja considera confirmado)
      source: { in: ['pdf_upload', 'pdf_share'] },
    },
    orderBy: [{ date: 'desc' }],
    take: 100,
    select: {
      id: true,
      date: true,
      amount: true,
      description: true,
      contraparte: true,
      type: true,
      category: true,
      isDeductible: true,
      isPersonal: true,
      notes: true,
    },
  });

  const count = pending.length;

  return NextResponse.json({
    pending,
    count,
  });
}
