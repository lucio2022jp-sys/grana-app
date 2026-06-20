/**
 * Editar/excluir cliente individual.
 *
 * GET    /api/clientes/[id] -> detalhe do cliente + historico de recibos e
 *                              receitas (transactions) com mesmo doc/nome.
 * PATCH  /api/clientes/[id] -> atualiza dados.
 * DELETE /api/clientes/[id] -> remove (recibos viram clienteId=null mas
 *                              mantem o snapshot do nome/doc).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  doc: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

function digitsOnly(s: string | null | undefined): string | null {
  if (s == null) return null;
  const d = s.replace(/\D/g, '');
  return d.length > 0 ? d : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.id },
  });
  if (!cliente || cliente.userId !== uid) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }

  const recibos = await prisma.recibo.findMany({
    where: { userId: uid, clienteId: cliente.id },
    orderBy: { data: 'desc' },
  });

  // Receitas (transactions) com mesmo doc OU contraparte casando.
  // E uma busca aproximada — historico, nao critico.
  const txs = await prisma.transaction.findMany({
    where: {
      userId: uid,
      type: 'receita',
      OR: [
        cliente.doc ? { contraparteDoc: cliente.doc } : { id: '___nope___' },
        { contraparte: { equals: cliente.nome, mode: 'insensitive' } },
      ],
    },
    orderBy: { date: 'desc' },
    take: 20,
  });

  const totalRecibos = recibos.reduce((acc, r) => acc + r.valor, 0);
  const totalTxs = txs.reduce((acc, t) => acc + t.amount, 0);

  return NextResponse.json({
    cliente,
    recibos,
    transactions: txs,
    totals: {
      recibos: totalRecibos,
      transactions: totalTxs,
      countRecibos: recibos.length,
      countTxs: txs.length,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const body = updateSchema.parse(await req.json());

  const existing = await prisma.cliente.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== uid) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }

  const data: any = {};
  if (body.nome !== undefined) data.nome = body.nome.trim();
  if (body.doc !== undefined) data.doc = digitsOnly(body.doc);
  if (body.whatsapp !== undefined) data.whatsapp = body.whatsapp?.trim() || null;
  if (body.email !== undefined) data.email = body.email?.trim() || null;
  if (body.endereco !== undefined) data.endereco = body.endereco?.trim() || null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

  const cliente = await prisma.cliente.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ cliente });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const existing = await prisma.cliente.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== uid) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }

  await prisma.cliente.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
