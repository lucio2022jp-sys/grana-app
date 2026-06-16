/**
 * Helpers compartilhados pra parceiros e avaliacoes.
 */

import { prisma } from './db';

const MIN_AVALIACOES_PRA_OCULTAR = 5;
const NOTA_MINIMA_VISIVEL = 3.0;

/**
 * Recalcula notaMedia e notaCount de um parceiro com base nas avaliacoes nao ocultas.
 */
export async function recalcularNotasParceiro(parceiroId: string) {
  const avals = await prisma.avaliacao.findMany({
    where: { parceiroId, oculta: false },
    select: { nota: true },
  });

  const notaCount = avals.length;
  const notaMedia = notaCount > 0
    ? avals.reduce((s, a) => s + a.nota, 0) / notaCount
    : null;

  await prisma.contadorParceiro.update({
    where: { id: parceiroId },
    data: { notaMedia, notaCount },
  });

  return { notaMedia, notaCount };
}

/**
 * Decide se um parceiro deve aparecer na lista publica.
 * Regra: tem que estar ativo + ou tem poucas avaliacoes ou media >= 3.
 */
export function isVisivelPublico(p: {
  ativo: boolean;
  notaMedia: number | null;
  notaCount: number;
}): boolean {
  if (!p.ativo) return false;
  if (p.notaCount < MIN_AVALIACOES_PRA_OCULTAR) return true;
  if (p.notaMedia === null) return true;
  return p.notaMedia >= NOTA_MINIMA_VISIVEL;
}
