import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { recalcularNotasParceiro } from '@/lib/parceiros';
import { z } from 'zod';

const createSchema = z.object({
  parceiroId: z.string(),
  nota: z.number().min(1).max(5),
  comentario: z.string().max(200).optional(),
});

/**
 * Cria ou atualiza avaliacao do user pra um parceiro.
 * Atualiza notaMedia e notaCount do parceiro.
 */
export async function POST(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const body = createSchema.parse(await req.json());

  // Verifica se realmente foi indicado pra esse parceiro
  const indicacao = await prisma.indicacao.findFirst({
    where: { userId: uid, parceiroId: body.parceiroId },
  });

  if (!indicacao) {
    return NextResponse.json(
      { error: 'Voce nao foi indicado a esse parceiro' },
      { status: 400 },
    );
  }

  // Upsert da avaliacao (1 por user/parceiro)
  const avaliacao = await prisma.avaliacao.upsert({
    where: {
      userId_parceiroId: {
        userId: uid,
        parceiroId: body.parceiroId,
      },
    },
    create: {
      userId: uid,
      parceiroId: body.parceiroId,
      nota: body.nota,
      comentario: body.comentario,
    },
    update: {
      nota: body.nota,
      comentario: body.comentario,
    },
  });

  // Marca a indicacao como avaliada
  await prisma.indicacao.update({
    where: { id: indicacao.id },
    data: { avaliadaEm: new Date() },
  });

  // Recalcula media do parceiro
  const stats = await recalcularNotasParceiro(body.parceiroId);

  return NextResponse.json({
    avaliacao,
    parceiroStats: stats,
  });
}

/**
 * Lista avaliacoes pendentes (indicacoes feitas ha mais de 30 dias e ainda nao avaliadas).
 */
export async function GET(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ pendentes: [] });

  const limite = new Date();
  limite.setDate(limite.getDate() - 30);

  const pendentes = await prisma.indicacao.findMany({
    where: {
      userId: uid,
      avaliadaEm: null,
      createdAt: { lte: limite },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      parceiro: {
        select: { id: true, nome: true, foto: true, especialidade: true },
      },
    },
  });

  return NextResponse.json({
    pendentes: pendentes.map((p) => ({
      indicacaoId: p.id,
      parceiro: p.parceiro,
      indicadoEm: p.createdAt,
    })),
  });
}
