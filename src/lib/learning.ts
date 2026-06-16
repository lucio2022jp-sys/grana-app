/**
 * Aprendizado continuo da classificacao.
 *
 * Estrategia em camadas:
 *  1. Match exato de contraparte (custo zero, 100% acurácia em recorrencias)
 *  2. Match fuzzy de contraparte (ordem trocada, abreviacao, etc.)
 *  3. Few-shot learning na IA (passa exemplos confirmados como contexto)
 *
 * Quanto mais o usuario corrige, mais o app acerta de primeira.
 */

import { prisma } from './db';
import type { ParsedTx } from './pdf-parser';
import type { TxClassification } from './classifier';

/**
 * Normaliza texto pra comparacao: minusculo, sem acento, sem espacos extras.
 */
export function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9 ]/g, ' ')      // remove pontuacao
    .replace(/\s+/g, ' ')              // espacos duplos
    .trim();
}

/**
 * Compara duas strings ignorando ordem das palavras.
 * "Sandra Costa M" e "Sandra M Costa" sao iguais.
 */
function tokensIguais(a: string, b: string): boolean {
  const ta = new Set(normalize(a).split(' ').filter(Boolean));
  const tb = new Set(normalize(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return false;
  if (ta.size !== tb.size) return false;
  for (const t of ta) {
    if (!tb.has(t)) return false;
  }
  return true;
}

/**
 * Score de similaridade pra contrapartes (0–1).
 * Considera matches parciais e tokens compartilhados.
 */
function similaridade(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (tokensIguais(a, b)) return 0.95;

  const ta = new Set(na.split(' ').filter(Boolean));
  const tb = new Set(nb.split(' ').filter(Boolean));
  const intersect = [...ta].filter((t) => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  if (union === 0) return 0;
  return intersect / union; // Jaccard
}

export type ClassificacaoConfirmada = {
  contraparte: string | null;
  contraparteDoc: string | null;
  description: string;
  amount: number;
  type: string;
  category: string;
  isDeductible: boolean;
  isPersonal: boolean;
};

/**
 * Busca classificacoes que o usuario ja confirmou.
 * Usado tanto pra match exato quanto como exemplos no prompt da IA.
 */
export async function getHistoricoConfirmado(
  userId: string,
  limit = 200,
): Promise<ClassificacaoConfirmada[]> {
  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      userConfirmed: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      contraparte: true,
      contraparteDoc: true,
      description: true,
      amount: true,
      type: true,
      category: true,
      isDeductible: true,
      isPersonal: true,
    },
  });
  return txs;
}

/**
 * Tenta classificar via match com historico.
 * Retorna null se nao achar match com confianca minima.
 */
export function classificarPorHistorico(
  tx: ParsedTx,
  historico: ClassificacaoConfirmada[],
): TxClassification | null {
  if (historico.length === 0) return null;

  const txContraparte = tx.contraparte ?? '';
  const txDescription = tx.description ?? '';
  const txDoc = tx.contraparteDoc ?? '';

  // 0. Match por CPF/CNPJ — chave mais forte que existe. Se a mesma pessoa/empresa
  //    aparecer em outro extrato com nome formatado diferente, ainda casa.
  if (txDoc) {
    const sinalTx = tx.amount > 0 ? 'positivo' : 'negativo';
    for (const h of historico) {
      if (!h.contraparteDoc) continue;
      if (h.contraparteDoc !== txDoc) continue;
      const hSinal = h.amount > 0 ? 'positivo' : 'negativo';
      if (hSinal !== sinalTx) continue;
      return {
        type: h.type as TxClassification['type'],
        category: h.category,
        isDeductible: h.isDeductible,
        isPersonal: h.isPersonal,
        confidence: 0.99,
        reasoning: `Mesmo CPF/CNPJ ja categorizado antes${h.contraparte ? ` ("${h.contraparte}")` : ''}`,
      };
    }
  }

  // 1. Match exato de contraparte (mesmo tipo - receita/despesa)
  const sinalTx = tx.amount > 0 ? 'positivo' : 'negativo';
  for (const h of historico) {
    if (!h.contraparte || !txContraparte) continue;
    const hSinal = h.amount > 0 ? 'positivo' : 'negativo';
    if (hSinal !== sinalTx) continue;
    if (normalize(h.contraparte) === normalize(txContraparte)) {
      return {
        type: h.type as TxClassification['type'],
        category: h.category,
        isDeductible: h.isDeductible,
        isPersonal: h.isPersonal,
        confidence: 0.98,
        reasoning: `Voce ja categorizou "${h.contraparte}" antes do mesmo jeito`,
      };
    }
  }

  // 2. Match com tokens iguais (ordem trocada)
  for (const h of historico) {
    if (!h.contraparte || !txContraparte) continue;
    const hSinal = h.amount > 0 ? 'positivo' : 'negativo';
    if (hSinal !== sinalTx) continue;
    if (tokensIguais(h.contraparte, txContraparte)) {
      return {
        type: h.type as TxClassification['type'],
        category: h.category,
        isDeductible: h.isDeductible,
        isPersonal: h.isPersonal,
        confidence: 0.92,
        reasoning: `Voce ja categorizou um nome parecido ("${h.contraparte}")`,
      };
    }
  }

  // 3. Match fuzzy: similaridade de tokens >= 0.7
  let melhorMatch: { h: ClassificacaoConfirmada; score: number } | null = null;
  for (const h of historico) {
    if (!h.contraparte || !txContraparte) continue;
    const hSinal = h.amount > 0 ? 'positivo' : 'negativo';
    if (hSinal !== sinalTx) continue;
    const score = similaridade(h.contraparte, txContraparte);
    if (score >= 0.7 && (!melhorMatch || score > melhorMatch.score)) {
      melhorMatch = { h, score };
    }
  }
  if (melhorMatch) {
    return {
      type: melhorMatch.h.type as TxClassification['type'],
      category: melhorMatch.h.category,
      isDeductible: melhorMatch.h.isDeductible,
      isPersonal: melhorMatch.h.isPersonal,
      confidence: 0.7 + melhorMatch.score * 0.2,
      reasoning: `Parece com "${melhorMatch.h.contraparte}" que voce categorizou antes`,
    };
  }

  // 4. Match na descricao (ex: "Pix recebido de" + nome)
  for (const h of historico) {
    if (!h.description || !txDescription) continue;
    const hSinal = h.amount > 0 ? 'positivo' : 'negativo';
    if (hSinal !== sinalTx) continue;
    const sim = similaridade(h.description, txDescription);
    if (sim >= 0.85) {
      return {
        type: h.type as TxClassification['type'],
        category: h.category,
        isDeductible: h.isDeductible,
        isPersonal: h.isPersonal,
        confidence: 0.75,
        reasoning: 'Descricao parecida com transacao anterior confirmada',
      };
    }
  }

  return null;
}

export type PadraoRecorrente = {
  contraparte: string | null;
  contraparteDoc: string | null;
  valorMedio: number;
  type: string;
  category: string;
  isDeductible: boolean;
  isPersonal: boolean;
  occurrences: number;
};

/**
 * Busca padroes recorrentes do usuario: agrupa transacoes ja marcadas como
 * isRecurring=true por contraparte+sinal e tira a classificacao dominante.
 *
 * Usado no pipeline pra reaproveitar inferencia mesmo quando o usuario nao
 * confirmou explicitamente. Se a contraparte aparece todo mes com o mesmo
 * tipo, e seguro repetir o tipo nas proximas vezes.
 */
export async function getPadroesRecorrentes(userId: string): Promise<PadraoRecorrente[]> {
  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      isRecurring: true,
    },
    select: {
      contraparte: true,
      contraparteDoc: true,
      amount: true,
      type: true,
      category: true,
      isDeductible: true,
      isPersonal: true,
    },
  });
  if (txs.length === 0) return [];

  // Agrupa por (doc OU contraparte normalizada) + sinal
  type Acc = {
    contraparte: string | null;
    contraparteDoc: string | null;
    soma: number;
    type: Map<string, number>;
    category: Map<string, number>;
    deductible: number;
    personal: number;
    count: number;
  };
  const grupos = new Map<string, Acc>();

  for (const t of txs) {
    const sinal = t.amount > 0 ? '+' : '-';
    const chave = t.contraparteDoc
      ? `doc:${t.contraparteDoc}|${sinal}`
      : `nome:${normalize(t.contraparte)}|${sinal}`;
    if (chave === `nome:|${sinal}`) continue; // sem chave util

    const acc = grupos.get(chave) ?? {
      contraparte: t.contraparte,
      contraparteDoc: t.contraparteDoc,
      soma: 0,
      type: new Map(),
      category: new Map(),
      deductible: 0,
      personal: 0,
      count: 0,
    };
    acc.soma += t.amount;
    acc.type.set(t.type, (acc.type.get(t.type) ?? 0) + 1);
    acc.category.set(t.category, (acc.category.get(t.category) ?? 0) + 1);
    if (t.isDeductible) acc.deductible += 1;
    if (t.isPersonal) acc.personal += 1;
    acc.count += 1;
    grupos.set(chave, acc);
  }

  const resultado: PadraoRecorrente[] = [];
  for (const acc of grupos.values()) {
    if (acc.count < 2) continue;
    const typeDominante = [...acc.type.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const catDominante = [...acc.category.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!typeDominante || !catDominante) continue;
    resultado.push({
      contraparte: acc.contraparte,
      contraparteDoc: acc.contraparteDoc,
      valorMedio: acc.soma / acc.count,
      type: typeDominante,
      category: catDominante,
      isDeductible: acc.deductible / acc.count >= 0.5,
      isPersonal: acc.personal / acc.count >= 0.5,
      occurrences: acc.count,
    });
  }

  return resultado;
}

/**
 * Verifica se a transacao casa com algum padrao recorrente do usuario.
 * Match por CPF/CNPJ tem prioridade; cai pra contraparte + valor proximo.
 */
export function classificarPorRecorrencia(
  tx: ParsedTx,
  padroes: PadraoRecorrente[],
): TxClassification | null {
  if (padroes.length === 0) return null;

  const sinalTx = tx.amount > 0 ? '+' : '-';
  const txDoc = tx.contraparteDoc ?? '';
  const txNomeNorm = normalize(tx.contraparte ?? '');

  for (const p of padroes) {
    const sinalP = p.valorMedio > 0 ? '+' : '-';
    if (sinalP !== sinalTx) continue;

    // Match forte: documento bate
    if (txDoc && p.contraparteDoc && txDoc === p.contraparteDoc) {
      return {
        type: p.type as TxClassification['type'],
        category: p.category,
        isDeductible: p.isDeductible,
        isPersonal: p.isPersonal,
        confidence: 0.93,
        reasoning: `Padrao recorrente do mesmo CPF/CNPJ (${p.occurrences}x)`,
      };
    }

    // Match medio: nome igual + valor +/-15%
    if (txNomeNorm && p.contraparte && normalize(p.contraparte) === txNomeNorm) {
      const max = Math.max(Math.abs(tx.amount), Math.abs(p.valorMedio));
      const diff = Math.abs(Math.abs(tx.amount) - Math.abs(p.valorMedio));
      if (max > 0 && diff / max <= 0.15) {
        return {
          type: p.type as TxClassification['type'],
          category: p.category,
          isDeductible: p.isDeductible,
          isPersonal: p.isPersonal,
          confidence: 0.85,
          reasoning: `Padrao recorrente: ${p.contraparte} aparece ${p.occurrences}x com valor parecido`,
        };
      }
    }
  }

  return null;
}

/**
 * Formata o historico como exemplos pro prompt da IA (few-shot).
 * Filtra exemplos diversos (uma por categoria) pra nao ficar redundante.
 */
export function historicoAsExemplos(historico: ClassificacaoConfirmada[], maxExemplos = 15): string {
  if (historico.length === 0) return '';

  // Pega ate 2 exemplos por categoria pra ter diversidade
  const porCategoria = new Map<string, ClassificacaoConfirmada[]>();
  for (const h of historico) {
    const lista = porCategoria.get(h.category) ?? [];
    if (lista.length < 2) {
      lista.push(h);
      porCategoria.set(h.category, lista);
    }
  }

  const exemplos: ClassificacaoConfirmada[] = [];
  for (const lista of porCategoria.values()) {
    exemplos.push(...lista);
    if (exemplos.length >= maxExemplos) break;
  }

  if (exemplos.length === 0) return '';

  const linhas = exemplos.map((h) => {
    const sinal = h.amount > 0 ? '+' : '';
    return `  - ${sinal}R$ ${h.amount.toFixed(2)} | ${h.description.slice(0, 50)} | ${h.contraparte ?? '-'} → type=${h.type}, category=${h.category}, deductible=${h.isDeductible}, personal=${h.isPersonal}`;
  });

  return `\n\nIMPORTANTE: O usuario ja confirmou estas classificacoes antes. Use como referencia pra manter consistencia:\n${linhas.join('\n')}`;
}
