/**
 * Projecao de faturamento e risco de desenquadre MEI.
 *
 * Limites legais (2026):
 *  - Teto MEI: R$ 81.000/ano. Passou disso, e desenquadrado.
 *  - Zona de tolerancia 20%: R$ 81.000 a R$ 97.200. Ainda da pra ficar
 *    no MEI ate o fim do ano, mas vai cair pro Simples no ano seguinte
 *    (cobrando DAS retroativo sobre o excedente).
 *  - Acima de R$ 97.200: desenquadre obrigatorio no mes seguinte.
 *
 * Como a gente projeta:
 *  - Tira a media mensal das receitas dos ultimos 3 meses (ou menos se
 *    o cadastro e novo).
 *  - Multiplica pelos meses que faltam no ano e soma com o que ja foi
 *    faturado.
 *  - Se a projecao passa do teto, vira alerta.
 */
import { prisma } from './db';
import { calcularDASExcedente, type DASExcedente } from './das';

export const MEI_TETO = 81000;
export const MEI_TETO_TOLERANCIA = 97200; // teto + 20%
const MEDIA_MESES = 3;

export type MEIProjection = {
  yearReceita: number;        // faturamento acumulado no ano
  mediaMensal: number;        // media dos ultimos meses considerados
  mesesRestantes: number;     // ate dezembro
  projecaoAnual: number;      // estimativa de fechamento do ano
  percentTeto: number;        // % sobre R$ 81.000
  percentTolerancia: number;  // % sobre R$ 97.200
  status: MEIStatus;
  mensagem: string;
  /** Estimativa do DAS extra do excedente. So preenchido quando o
   *  faturamento ja passou ou tende a passar do teto MEI. */
  dasExcedente?: DASExcedente | null;
  /** Mesma estimativa para a projecao de fim de ano (cenario futuro). */
  dasExcedenteProjetado?: DASExcedente | null;
};

export type MEIStatus =
  | 'tranquilo'      // < 60% do teto projetado
  | 'atento'         // 60-85% do teto
  | 'risco'          // 85-100% do teto
  | 'estourado'      // ja passou do teto, ainda na tolerancia
  | 'desenquadre';   // passou da tolerancia (97.200)

export async function getMEIProjection(
  userId: string,
  hoje: Date = new Date(),
): Promise<MEIProjection> {
  const ano = hoje.getFullYear();
  const mesAtual = hoje.getMonth(); // 0-11

  const yearStart = new Date(ano, 0, 1);
  const yearEnd = new Date(ano + 1, 0, 1);

  // Atividade do MEI pra escolher o anexo no calculo do excedente.
  const userInfo = await prisma.user.findUnique({
    where: { id: userId },
    select: { meiAtividade: true },
  });
  const meiAtividade = userInfo?.meiAtividade ?? null;

  // Faturamento total do ano
  const yearAgg = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'receita',
      date: { gte: yearStart, lt: yearEnd },
    },
    _sum: { amount: true },
  });
  const yearReceita = Math.abs(yearAgg._sum.amount ?? 0);

  // Media dos ultimos N meses (incluindo o atual). Janela movel.
  const mediaInicio = new Date(ano, mesAtual - (MEDIA_MESES - 1), 1);
  const mediaAgg = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'receita',
      date: { gte: mediaInicio, lte: hoje },
    },
    _sum: { amount: true },
  });
  // Se cadastro tem menos de N meses de historico, divide pelo que tem.
  const mesesConsiderados = Math.min(MEDIA_MESES, mesAtual + 1);
  const mediaMensal = mesesConsiderados > 0
    ? Math.abs(mediaAgg._sum.amount ?? 0) / mesesConsiderados
    : 0;

  const mesesRestantes = 11 - mesAtual; // se estamos em junho (5), faltam 6
  const projecaoAnual = yearReceita + mediaMensal * mesesRestantes;

  const percentTeto = (projecaoAnual / MEI_TETO) * 100;
  const percentTolerancia = (projecaoAnual / MEI_TETO_TOLERANCIA) * 100;

  // Status: olha tanto o realizado quanto a projecao.
  let status: MEIStatus;
  let mensagem: string;

  if (yearReceita >= MEI_TETO_TOLERANCIA) {
    status = 'desenquadre';
    mensagem = 'Voce passou de R$ 97.200 e precisa migrar pro Simples Nacional.';
  } else if (yearReceita >= MEI_TETO) {
    status = 'estourado';
    mensagem = `Voce passou do teto MEI (R$ 81.000). Ainda da pra terminar o ano, mas vai pagar DAS extra sobre o excedente e migrar pro Simples no ano que vem.`;
  } else if (projecaoAnual >= MEI_TETO_TOLERANCIA) {
    status = 'desenquadre';
    mensagem = `Mantendo o ritmo atual, voce passa de R$ 97.200 ate o fim do ano. Pense em migrar pro Simples agora pra evitar dor de cabeca depois.`;
  } else if (projecaoAnual >= MEI_TETO) {
    status = 'risco';
    mensagem = `Mantendo o ritmo atual, voce passa de R$ 81.000 ate o fim do ano. Da pra segurar reduzindo o ritmo ou ja se preparar pro Simples.`;
  } else if (percentTeto >= 60) {
    status = 'atento';
    mensagem = `Voce ja faturou ${percentTeto.toFixed(0)}% do limite projetado. Da pra continuar, mas fique de olho no ritmo.`;
  } else {
    status = 'tranquilo';
    mensagem = `Faturamento dentro do esperado pro MEI.`;
  }

  return {
    yearReceita,
    mediaMensal,
    mesesRestantes,
    projecaoAnual,
    percentTeto: Math.min(200, percentTeto),
    percentTolerancia: Math.min(200, percentTolerancia),
    status,
    mensagem,
    // Excedente "hoje": baseado no que ja foi faturado.
    dasExcedente:
      yearReceita > MEI_TETO
        ? calcularDASExcedente({ yearReceita, meiAtividade })
        : null,
    // Excedente projetado pro fim do ano. Util pra avisar o usuario
    // do tamanho da conta caso o ritmo se mantenha.
    dasExcedenteProjetado:
      projecaoAnual > MEI_TETO
        ? calcularDASExcedente({ yearReceita: projecaoAnual, meiAtividade })
        : null,
  };
}
