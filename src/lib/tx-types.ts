/**
 * Tipos de transacao suportados.
 *
 * Cada tipo afeta de forma diferente os calculos:
 *  - receita: entra no faturamento (conta pra limite MEI), e lucro
 *  - despesa: sai do lucro, pode ser dedutivel
 *  - pessoal: nao entra no lucro do negocio, mas mostra que conta foi usada pra algo pessoal
 *  - transferencia: entre contas do proprio user (ignorado no lucro)
 *  - prolabore: sai do lucro (despesa fixa do socio em ME), nao e dedutivel pra MEI
 *  - retirada: dono saca dinheiro pra PF, nao e despesa, nao reduz lucro mas "consome" caixa
 *  - emprestimo: entrada/saida sem ser receita/despesa real
 *  - investimento: aplicacao financeira, fora do lucro operacional
 *  - reembolso: estorno/devolucao, sinal contrario da transacao original
 */

export type TxType =
  | 'receita'
  | 'despesa'
  | 'pessoal'
  | 'transferencia'
  | 'prolabore'
  | 'retirada'
  | 'emprestimo'
  | 'investimento'
  | 'reembolso';

export const TX_TYPES: TxType[] = [
  'receita',
  'despesa',
  'pessoal',
  'transferencia',
  'prolabore',
  'retirada',
  'emprestimo',
  'investimento',
  'reembolso',
];

export const TX_TYPE_INFO: Record<TxType, {
  label: string;
  emoji: string;
  cor: string;
  descricao: string;
  contaNoLucro: boolean;       // Entra no calculo de lucro do negocio?
  contaNoFaturamento: boolean; // Entra no limite MEI / faturamento bruto?
  podeDeduzir: boolean;        // Pode marcar como dedutivel?
}> = {
  receita: {
    label: 'Receita',
    emoji: '💰',
    cor: 'green',
    descricao: 'Pagamento que voce recebeu de cliente.',
    contaNoLucro: true,
    contaNoFaturamento: true,
    podeDeduzir: false,
  },
  despesa: {
    label: 'Despesa do trabalho',
    emoji: '📉',
    cor: 'orange',
    descricao: 'Gasto pra manter o negocio rodando.',
    contaNoLucro: true,
    contaNoFaturamento: false,
    podeDeduzir: true,
  },
  pessoal: {
    label: 'Pessoal',
    emoji: '🛒',
    cor: 'gray',
    descricao: 'Gasto que nao tem relacao com o trabalho.',
    contaNoLucro: false,
    contaNoFaturamento: false,
    podeDeduzir: false,
  },
  transferencia: {
    label: 'Transferencia',
    emoji: '🔁',
    cor: 'blue',
    descricao: 'Entre suas proprias contas. Nao e receita nem despesa.',
    contaNoLucro: false,
    contaNoFaturamento: false,
    podeDeduzir: false,
  },
  prolabore: {
    label: 'Pro-labore',
    emoji: '👔',
    cor: 'indigo',
    descricao: 'Salario do socio (mais comum em ME). Sai do lucro.',
    contaNoLucro: true,
    contaNoFaturamento: false,
    podeDeduzir: false,
  },
  retirada: {
    label: 'Retirada',
    emoji: '🏦',
    cor: 'purple',
    descricao: 'Voce tirou dinheiro da empresa pra usar como pessoa fisica.',
    contaNoLucro: false,
    contaNoFaturamento: false,
    podeDeduzir: false,
  },
  emprestimo: {
    label: 'Emprestimo',
    emoji: '🤝',
    cor: 'teal',
    descricao: 'Recebeu ou pagou emprestimo. Nao conta no lucro nem no faturamento.',
    contaNoLucro: false,
    contaNoFaturamento: false,
    podeDeduzir: false,
  },
  investimento: {
    label: 'Investimento',
    emoji: '📈',
    cor: 'cyan',
    descricao: 'Aplicacao financeira (CDB, acoes, etc.). Fora do operacional.',
    contaNoLucro: false,
    contaNoFaturamento: false,
    podeDeduzir: false,
  },
  reembolso: {
    label: 'Reembolso',
    emoji: '↩️',
    cor: 'pink',
    descricao: 'Estorno ou devolucao de pagamento.',
    contaNoLucro: true,
    contaNoFaturamento: false,
    podeDeduzir: false,
  },
};

/**
 * Helper: dado um type, retorna se entra no calculo de lucro liquido.
 */
export function contaNoLucro(type: string): boolean {
  return TX_TYPE_INFO[type as TxType]?.contaNoLucro ?? false;
}

/**
 * Helper: dado um type, retorna se entra no faturamento bruto (limite MEI).
 */
export function contaNoFaturamento(type: string): boolean {
  return TX_TYPE_INFO[type as TxType]?.contaNoFaturamento ?? false;
}

/**
 * Helper: dado um type, retorna se pode marcar como dedutivel.
 */
export function podeSerDedutivel(type: string): boolean {
  return TX_TYPE_INFO[type as TxType]?.podeDeduzir ?? false;
}
