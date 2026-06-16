/**
 * Calculo do DAS pelo Simples Nacional.
 *
 * Cada anexo tem 6 faixas conforme RBT12 (Receita Bruta dos Ultimos 12 meses).
 * Formula da aliquota efetiva:
 *
 *   aliquota_efetiva = (RBT12 × aliquota_nominal − parcela_deduzir) / RBT12
 *
 * DAS mensal = receita_do_mes × aliquota_efetiva
 *
 * Limites: Faturamento anual ate R$ 4.800.000 pra Simples (mas ate R$ 360k entra
 * com aliquota tabelada normal). Quem passa do MEI (R$ 81k) ja pode aderir.
 *
 * Tabelas atualizadas conforme LC 123/2006 com alteracoes de 2018+.
 */

export type SimplesAnexo = 'I' | 'III' | 'IV' | 'V';

export type FaixaSimples = {
  ate: number;          // RBT12 maxima da faixa (em reais)
  aliquota: number;     // aliquota nominal (decimal, ex 0.06 = 6%)
  deduzir: number;      // parcela a deduzir (em reais)
};

/**
 * Anexo I — Comercio
 */
export const ANEXO_I: FaixaSimples[] = [
  { ate: 180_000,    aliquota: 0.040,  deduzir: 0 },
  { ate: 360_000,    aliquota: 0.073,  deduzir: 5_940 },
  { ate: 720_000,    aliquota: 0.095,  deduzir: 13_860 },
  { ate: 1_800_000,  aliquota: 0.107,  deduzir: 22_500 },
  { ate: 3_600_000,  aliquota: 0.143,  deduzir: 87_300 },
  { ate: 4_800_000,  aliquota: 0.190,  deduzir: 378_000 },
];

/**
 * Anexo III — Servicos (cabeleireira, manicure, dev, professor, fotografo, etc.)
 * O mais comum entre autonomos.
 */
export const ANEXO_III: FaixaSimples[] = [
  { ate: 180_000,    aliquota: 0.060,  deduzir: 0 },
  { ate: 360_000,    aliquota: 0.112,  deduzir: 9_360 },
  { ate: 720_000,    aliquota: 0.135,  deduzir: 17_640 },
  { ate: 1_800_000,  aliquota: 0.160,  deduzir: 35_640 },
  { ate: 3_600_000,  aliquota: 0.210,  deduzir: 125_640 },
  { ate: 4_800_000,  aliquota: 0.330,  deduzir: 648_000 },
];

/**
 * Anexo IV — Servicos (limpeza, vigilancia, construcao, advocacia)
 */
export const ANEXO_IV: FaixaSimples[] = [
  { ate: 180_000,    aliquota: 0.045,  deduzir: 0 },
  { ate: 360_000,    aliquota: 0.090,  deduzir: 8_100 },
  { ate: 720_000,    aliquota: 0.102,  deduzir: 12_420 },
  { ate: 1_800_000,  aliquota: 0.140,  deduzir: 39_780 },
  { ate: 3_600_000,  aliquota: 0.220,  deduzir: 183_780 },
  { ate: 4_800_000,  aliquota: 0.330,  deduzir: 828_000 },
];

/**
 * Anexo V — Servicos tecnicos (auditoria, consultoria, jornalismo, engenharia)
 */
export const ANEXO_V: FaixaSimples[] = [
  { ate: 180_000,    aliquota: 0.155,  deduzir: 0 },
  { ate: 360_000,    aliquota: 0.180,  deduzir: 4_500 },
  { ate: 720_000,    aliquota: 0.195,  deduzir: 9_900 },
  { ate: 1_800_000,  aliquota: 0.205,  deduzir: 17_100 },
  { ate: 3_600_000,  aliquota: 0.230,  deduzir: 62_100 },
  { ate: 4_800_000,  aliquota: 0.305,  deduzir: 540_000 },
];

const ANEXOS: Record<SimplesAnexo, FaixaSimples[]> = {
  I: ANEXO_I,
  III: ANEXO_III,
  IV: ANEXO_IV,
  V: ANEXO_V,
};

/**
 * Encontra a faixa correta com base no RBT12.
 */
export function encontrarFaixa(rbt12: number, anexo: SimplesAnexo): FaixaSimples {
  const tabela = ANEXOS[anexo];
  for (const faixa of tabela) {
    if (rbt12 <= faixa.ate) return faixa;
  }
  // Acima do limite, retorna ultima faixa (acima de R$ 4,8M sai do Simples na verdade)
  return tabela[tabela.length - 1];
}

/**
 * Calcula a aliquota efetiva conforme formula oficial.
 */
export function calcularAliquotaEfetiva(rbt12: number, anexo: SimplesAnexo): number {
  if (rbt12 <= 0) {
    // Sem historico, usa aliquota da primeira faixa direto
    return ANEXOS[anexo][0].aliquota;
  }
  const faixa = encontrarFaixa(rbt12, anexo);
  return (rbt12 * faixa.aliquota - faixa.deduzir) / rbt12;
}

/**
 * Calcula o DAS mensal pelo Simples Nacional.
 */
export function calcularDASSimples(
  receitaMes: number,
  rbt12: number,
  anexo: SimplesAnexo,
): { das: number; aliquota: number; faixa: number } {
  const aliquota = calcularAliquotaEfetiva(rbt12, anexo);
  const tabela = ANEXOS[anexo];
  const faixaIdx = tabela.findIndex((f) => rbt12 <= f.ate);
  return {
    das: Math.max(0, receitaMes * aliquota),
    aliquota,
    faixa: faixaIdx === -1 ? 6 : faixaIdx + 1,
  };
}

/**
 * Anexos disponiveis com descricao amigavel.
 */
export const ANEXO_OPCOES = [
  {
    value: 'I' as const,
    label: 'Comercio',
    emoji: '🏪',
    descricao: 'Voce vende produto fisico (revenda, lojinha, loja virtual).',
    exemplos: 'revendedora, sacoleira, lojinha, brecho',
  },
  {
    value: 'III' as const,
    label: 'Servicos comuns',
    emoji: '🛠️',
    descricao: 'Maioria dos autonomos cai aqui. Servicos de beleza, ensino, tecnologia.',
    exemplos: 'manicure, cabelo, dev, professor, fotografo, personal',
    destaque: true,
  },
  {
    value: 'IV' as const,
    label: 'Servicos especificos',
    emoji: '🧹',
    descricao: 'Limpeza, conservacao, vigilancia, construcao, advocacia.',
    exemplos: 'diarista, faxineira, vigilante, advogado, pedreiro',
  },
  {
    value: 'V' as const,
    label: 'Servicos tecnicos',
    emoji: '📊',
    descricao: 'Consultoria, engenharia, auditoria.',
    exemplos: 'consultor, engenheiro, contador, jornalista',
  },
];

/**
 * Limites importantes
 */
export const LIMITE_MEI = 81_000;
export const LIMITE_SIMPLES = 4_800_000;
export const ANTECEDENCIA_ALERTA = 0.7; // alerta quando passa 70% do MEI
export const URGENCIA_ALERTA = 0.9;     // urgente quando passa 90%
