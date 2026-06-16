import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { z } from 'zod';

const schema = z.object({
  ids: z.array(z.string()).optional(), // se omitido, confirma tudo
});

/**
 * Confirma multiplas transacoes pendentes de uma vez.
 */
export async function POST(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const body = schema.parse(await req.json().catch(() => ({})));

  const where: any = {
    userId: uid,
    userConfirmed: false,
    source: { in: ['pdf_upload', 'pdf_share'] },
  };
  if (body.ids && body.ids.length > 0) {
    where.id = { in: body.ids };
  }

  const result = await prisma.transaction.updateMany({
    where,
    data: { userConfirmed: true },
  });

  return NextResponse.json({ confirmed: result.count });
}
