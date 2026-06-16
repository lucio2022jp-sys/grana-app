/**
 * Deduplicacao de transacoes.
 *
 * Quando o usuario reupa o mesmo extrato (acidentalmente ou propositalmente
 * pra atualizar), nao queremos duplicar nada. Usamos um hash baseado em:
 *   data + valor (centavos) + contraparte + primeiros 30 chars da descricao
 *
 * Se mudou alguma dessas coisas, e transacao diferente.
 */

import crypto from 'crypto';

export type TxIdentifier = {
  date: Date | string;
  amount: number;
  contraparte?: string | null;
  description: string;
};

function normalizeStr(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30);
}

/**
 * Hash determinista pra identificar uma transacao.
 */
export function hashTx(tx: TxIdentifier): string {
  const dateStr = (tx.date instanceof Date ? tx.date : new Date(tx.date))
    .toISOString()
    .slice(0, 10); // so a data, sem hora
  const valor = Math.round(tx.amount * 100); // centavos pra evitar float
  const contraparte = normalizeStr(tx.contraparte);
  const desc = normalizeStr(tx.description);

  const key = `${dateStr}|${valor}|${contraparte}|${desc}`;
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

/**
 * Filtra transacoes removendo as que ja existem na lista.
 */
export function dedupTransactions<T extends TxIdentifier>(
  novas: T[],
  existentes: TxIdentifier[],
): { novas: T[]; duplicadas: number } {
  const hashesExistentes = new Set(existentes.map(hashTx));
  const filtradas = novas.filter((tx) => !hashesExistentes.has(hashTx(tx)));
  return {
    novas: filtradas,
    duplicadas: novas.length - filtradas.length,
  };
}
