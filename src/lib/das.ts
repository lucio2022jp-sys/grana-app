/**
 * Calculo do DAS-MEI (valores 2026 atualizados conforme INSS).
 *
 * O DAS-MEI tem 3 partes:
 *  - INSS: 5% do salario minimo
 *  - ICMS: R$ 1,00 (so se atividade tem comercio/industria)
 *  - ISS: R$ 5,00 (so se atividade tem servicos)
 *
 * Salario minimo 2026: R$ 1.518,00 (atualizar conforme Governo)
 *   5% = R$ 75,90
 */

import { calcularDASSimples, SimplesAnexo } from './simples';

export type AtividadeMEI = 'comercio' | 'industria' | 'servicos' | 'comercio_servicos';
export type Regime = 'mei' | 'simples' | 'nenhum';

const INSS_VALOR = 75.90;
const ICMS = 1.00;
const ISS = 5.00;

export function calcularDAS(atividade?: string | null): number {
  switch (atividade) {
    case 'comercio':
    case 'industria':
      return INSS_VALOR + ICMS; // 76,90
    case 'servicos':
      return INSS_VALOR + ISS; // 80,90
    case 'comercio_servicos':
      return INSS_VALOR + ICMS + ISS; // 81,90
    default:
      // Default: assume servicos (mais comum em autonomos)
      return INSS_VALOR + ISS;
  }
}

/**
 * Vencimento: dia 20 do mes seguinte.
 * Ex: DAS de outubro vence em 20 de novembro.
 */
export function calcularVencimento(month: number, year: number): Date {
  // month e 1-12
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(nextYear, nextMonth - 1, 20, 23, 59, 59);
}

/**
 * Multa e juros por atraso (aproximado).
 * Multa: 0,33% por dia, max 20%
 * Juros: Selic acumulada (~1% ao mes em 2026)
 */
export function calcularMultaAtraso(valorOriginal: number, dueDate: Date, hoje: Date = new Date()): number {
  if (hoje <= dueDate) return 0;
  const diasAtraso = Math.floor((hoje.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  const multaPercent = Math.min(0.0033 * diasAtraso, 0.20); // max 20%
  const mesesAtraso = diasAtraso / 30;
  const jurosPercent = 0.01 * mesesAtraso;
  return valorOriginal * (multaPercent + jurosPercent);
}

/**
 * Status do DAS pra exibir na home.
 */
export type DASStatus = 'em_dia' | 'proximo' | 'urgente' | 'atrasado' | 'pago';

export function getDASStatus(dueDate: Date, paidAt: Date | null, hoje: Date = new Date()): DASStatus {
  if (paidAt) return 'pago';
  const diff = dueDate.getTime() - hoje.getTime();
  const dias = diff / (1000 * 60 * 60 * 24);
  if (dias < 0) return 'atrasado';
  if (dias < 3) return 'urgente';
  if (dias < 8) return 'proximo';
  return 'em_dia';
}

export const ATIVIDADES = [
  { value: 'comercio', label: 'Comercio (lojinha, revenda)', das: 76.90, emoji: '🏪' },
  { value: 'industria', label: 'Industria (producao)', das: 76.90, emoji: '🏭' },
  { value: 'servicos', label: 'Servicos (a maioria dos autonomos)', das: 80.90, emoji: '🛠️' },
  { value: 'comercio_servicos', label: 'Comercio + Servicos', das: 81.90, emoji: '🏪🛠️' },
];

/**
 * Link pra gerar boleto no PGMEI (Receita Federal).
 * Direciona pro portal oficial.
 */
export const PGMEI_URL = 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/';

/**
 * Link pra gerar DAS do Simples Nacional (PGDAS-D).
 */
export const PGDAS_URL = 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgdasd.app/default.aspx';

/**
 * Calculo unificado do DAS conforme regime tributario.
 * Retorna o valor do DAS pro mes especifico.
 */
export type DASCalculation = {
  value: number;
  regime: Regime;
  rbt12?: number;
  aliquota?: number;
  faixa?: number;
};

export function calcularDASMensal(opts: {
  regime?: string | null;
  meiAtividade?: string | null;
  simplesAnexo?: string | null;
  receitaMes?: number;
  rbt12?: number;
}): DASCalculation {
  const regime = (opts.regime ?? 'mei') as Regime;

  if (regime === 'simples' && opts.simplesAnexo) {
    const anexo = opts.simplesAnexo as SimplesAnexo;
    const receita = opts.receitaMes ?? 0;
    const rbt12 = opts.rbt12 ?? 0;
    const calc = calcularDASSimples(receita, rbt12, anexo);
    return {
      value: calc.das,
      regime: 'simples',
      rbt12,
      aliquota: calc.aliquota,
      faixa: calc.faixa,
    };
  }

  if (regime === 'nenhum') {
    return { value: 0, regime: 'nenhum' };
  }

  // Default: MEI
  return {
    value: calcularDAS(opts.meiAtividade),
    regime: 'mei',
  };
}
