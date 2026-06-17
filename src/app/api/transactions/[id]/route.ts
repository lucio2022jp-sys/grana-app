import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  type: z.enum(['receita', 'despesa', 'transferencia', 'pessoal', 'prolabore', 'retirada', 'emprestimo', 'investimento', 'reembolso']).optional(),
  category: z.string().optional(),
  isDeductible: z.boolean().optional(),
  isPersonal: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const data = updateSchema.parse(await req.json());

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!tx || tx.userId !== uid) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }

  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: { ...data, userConfirmed: true },
  });

  // Telemetria: se o usuario alterou type/category/flags em tx que veio de upload,
  // contabiliza como correcao do classificador.
  const corrigiuClassificacao =
    (data.type !== undefined && data.type !== tx.type) ||
    (data.category !== undefined && data.category !== tx.category) ||
    (data.isDeductible !== undefined && data.isDeductible !== tx.isDeductible) ||
    (data.isPersonal !== undefined && data.isPersonal !== tx.isPersonal);

  if (corrigiuClassificacao && tx.uploadId) {
    try {
      const metric = await prisma.classificationMetric.findFirst({
        where: { uploadId: tx.uploadId },
        orderBy: { createdAt: 'desc' },
      });
      if (metric) {
        await prisma.classificationMetric.update({
          where: { id: metric.id },
          data: {
            correctedTxs: { increment: 1 },
            correctedAt: new Date(),
          },
        });
      }
    } catch (err) {
      console.error('Erro ao incrementar correctedTxs:', err);
    }
  }

  // Memoria de correcao negativa: se a tx veio de sugestao da IA e o usuario
  // alterou a classificacao, guarda o par (sugestao IA -> correcao usuario)
  // pra alimentar o prompt em uploads futuros.
  if (corrigiuClassificacao && tx.aiSuggested) {
    try {
      await prisma.classificationCorrection.create({
        data: {
          userId: uid,
          description: tx.description,
          contraparte: tx.contraparte,
          contraparteDoc: tx.contraparteDoc,
          amount: tx.amount,
          aiType: tx.type,
          aiCategory: tx.category,
          aiIsDeductible: tx.isDeductible,
          aiIsPersonal: tx.isPersonal,
          userType: updated.type,
          userCategory: updated.category,
          userIsDeductible: updated.isDeductible,
          userIsPersonal: updated.isPersonal,
        },
      });
    } catch (err) {
      console.error('Erro ao gravar ClassificationCorrection:', err);
    }
  }

  return NextResponse.json({ transaction: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!tx || tx.userId !== uid) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
