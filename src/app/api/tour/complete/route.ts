import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tour/complete
 *
 * Marca o tour de boas-vindas como concluido. Setado quando o usuario
 * clica "Pronto" no ultimo passo ou pula. Idempotente: chamadas repetidas
 * nao trocam o timestamp.
 */
export async function POST(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { tourCompletedAt: true },
  });
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (user.tourCompletedAt) {
    return NextResponse.json({ ok: true, alreadyCompleted: true });
  }

  await prisma.user.update({
    where: { id: uid },
    data: { tourCompletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
