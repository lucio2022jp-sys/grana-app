import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { z } from 'zod';

const updateSchema = z.object({
  paidAt: z.string().nullable().optional(),
  value: z.number().optional(),
  notes: z.string().optional(),
  proofUrl: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const data = updateSchema.parse(await req.json());

  const payment = await prisma.dASPayment.findUnique({ where: { id: params.id } });
  if (!payment || payment.userId !== uid) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }

  const updated = await prisma.dASPayment.update({
    where: { id: params.id },
    data: {
      ...data,
      paidAt: data.paidAt === null ? null : data.paidAt ? new Date(data.paidAt) : undefined,
    },
  });

  // Se marcou como pago, cria transacao automatica
  if (data.paidAt && !payment.paidAt) {
    await prisma.transaction.create({
      data: {
        userId: uid,
        date: new Date(data.paidAt),
        amount: -updated.value,
        description: `DAS ${String(updated.month).padStart(2, '0')}/${updated.year}`,
        contraparte: 'Receita Federal',
        type: 'despesa',
        category: 'servicos',
        isDeductible: false, // DAS nao e dedutivel pra MEI
        source: 'manual',
        userConfirmed: true,
        notes: 'Pagamento DAS automatico',
      },
    });
  }

  return NextResponse.json({ payment: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const payment = await prisma.dASPayment.findUnique({ where: { id: params.id } });
  if (!payment || payment.userId !== uid) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }

  await prisma.dASPayment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
