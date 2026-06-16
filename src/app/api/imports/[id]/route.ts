import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';

/**
 * Detalhe de um import.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const upload = await prisma.upload.findUnique({
    where: { id: params.id },
    include: {
      transactions: {
        select: {
          id: true,
          date: true,
          amount: true,
          description: true,
          contraparte: true,
          type: true,
          category: true,
        },
        orderBy: { date: 'desc' },
        take: 200,
      },
    },
  });

  if (!upload || upload.userId !== uid) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }

  return NextResponse.json({ upload });
}

/**
 * Remove um import e TODAS as transacoes ligadas a ele.
 * Util quando o usuario importou errado ou quer limpar.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const upload = await prisma.upload.findUnique({ where: { id: params.id } });
  if (!upload || upload.userId !== uid) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }

  // Apaga primeiro as transacoes ligadas a esse upload (escopo do user)
  const txDel = await prisma.transaction.deleteMany({
    where: { userId: uid, uploadId: params.id },
  });

  // Depois apaga o upload em si
  await prisma.upload.delete({ where: { id: params.id } });

  return NextResponse.json({
    ok: true,
    transactionsDeleted: txDel.count,
  });
}
