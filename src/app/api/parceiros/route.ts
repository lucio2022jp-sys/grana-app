import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { isVisivelPublico } from '@/lib/parceiros';

/**
 * Lista parceiros publicos pra MEI escolher.
 * Aplica regras de visibilidade (esconde quem tem nota baixa).
 */
export async function GET(req: NextRequest) {
  const todos = await prisma.contadorParceiro.findMany({
    where: { ativo: true },
    orderBy: [
      { notaMedia: { sort: 'desc', nulls: 'last' } },
      { ordem: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  const visiveis = todos.filter(isVisivelPublico).map((p) => ({
    id: p.id,
    nome: p.nome,
    foto: p.foto,
    especialidade: p.especialidade,
    cidade: p.cidade,
    preco: p.preco,
    bio: p.bio,
    notaMedia: p.notaMedia,
    notaCount: p.notaCount,
  }));

  return NextResponse.json({ parceiros: visiveis });
}
