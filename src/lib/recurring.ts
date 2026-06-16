/**
 * Detector de pagamentos/recebimentos recorrentes.
 *
 * Estrategia:
 *  1. Agrupa transacoes por (contraparte normalizada + sinal + valor +/- 10%)
 *  2. Pra cada grupo, conta em quantos meses distintos aparece nos ultimos 6
 *  3. Se aparece em >= 2 dos ultimos 3 meses OU >= 3 dos ultimos 6, e recorrente
 *  4. Calcula intervalo medio entre ocorrencias (proximo de 30 dias = mensal)
 *
 * Util pra:
 *  - Previsao de fluxo de caixa (sabemos que aluguel vai sair dia X)
 *  - Identificar despesas fixas (internet, luz, aluguel)
 *  - Identificar clientes recorrentes (Maria sempre vem todo mes)
 *  - Alertar quando um pagamento recorrente "some" (cliente parou de pagar)
 */

import { prisma } from './db';
import { normalize } from './learning';

export type RecurringGroup = {
  key: string;                 // chave do grupo (contraparte+valor)
  contraparte: string;
  valorMedio: number;          // media dos valores
  type: string;                // receita, despesa, etc.
  category: string;
  occurrences: number;          // quantas vezes apareceu no periodo
  monthsActive: number;         // em quantos meses distintos
  intervalMedio: number;        // dias entre ocorrencias
  ultimaData: Date;
  proximaPrevista?: Date;
  transactionIds: string[];
};

const TOLERANCIA_VALOR = 0.10; // +/- 10%

function chaveGrupo(contraparte: string | null, valor: number): string {
  const c = normalize(contraparte ?? 'sem contraparte');
  const sinal = valor > 0 ? '+' : '-';
  // Arredonda valor pra dezena pra agrupar variacoes pequenas
  const v = Math.round(Math.abs(valor) / 10) * 10;
  return `${c}|${sinal}${v}`;
}

function valoresProximos(a: number, b: number): boolean {
  if (Math.sign(a) !== Math.sign(b)) return false;
  const max = Math.max(Math.abs(a), Math.abs(b));
  const diff = Math.abs(Math.abs(a) - Math.abs(b));
  return diff / max <= TOLERANCIA_VALOR;
}

/**
 * Detecta grupos recorrentes a partir das transacoes do user.
 */
export async function detectarRecorrentes(userId: string): Promise<RecurringGroup[]> {
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: seisMesesAtras },
      type: { in: ['receita', 'despesa', 'pessoal', 'prolabore', 'aluguel'] },
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      date: true,
      amount: true,
      contraparte: true,
      description: true,
      type: true,
      category: true,
    },
  });

  // Agrupa por chave aproximada
  const grupos = new Map<string, typeof txs>();
  for (const tx of txs) {
    const key = chaveGrupo(tx.contraparte, tx.amount);
    const lista = grupos.get(key) ?? [];
    lista.push(tx);
    grupos.set(key, lista);
  }

  const resultado: RecurringGroup[] = [];

  for (const [key, lista] of grupos.entries()) {
    if (lista.length < 2) continue;

    // Verifica em quantos meses distintos apareceu (formato YYYY-MM)
    const mesesUnicos = new Set(
      lista.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`),
    );
    const monthsActive = mesesUnicos.size;

    // Ultimos 3 meses pra check de recente
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
    const recentes = lista.filter((t) => t.date >= tresMesesAtras);
    const mesesRecentes = new Set(
      recentes.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`),
    ).size;

    // Criterio: 2/3 ultimos OU 3/6 totais
    const isRecurring = mesesRecentes >= 2 || monthsActive >= 3;
    if (!isRecurring) continue;

    // Calcula intervalo medio entre ocorrencias consecutivas
    const sorted = [...lista].sort((a, b) => a.date.getTime() - b.date.getTime());
    let totalDiff = 0;
    for (let i = 1; i < sorted.length; i++) {
      const diff = sorted[i].date.getTime() - sorted[i - 1].date.getTime();
      totalDiff += diff / (1000 * 60 * 60 * 24);
    }
    const intervalMedio = sorted.length > 1 ? totalDiff / (sorted.length - 1) : 30;

    // Considera recorrente real se intervalo entre 20 e 45 dias (mensal aprox)
    if (intervalMedio < 20 || intervalMedio > 45) continue;

    const valorMedio =
      lista.reduce((s, t) => s + t.amount, 0) / lista.length;

    const ultimaData = sorted[sorted.length - 1].date;
    const proximaPrevista = new Date(ultimaData);
    proximaPrevista.setDate(proximaPrevista.getDate() + Math.round(intervalMedio));

    // Pega contraparte mais comum (primeira nao vazia)
    const contraparte = lista.find((t) => t.contraparte)?.contraparte
      ?? lista[0].description.slice(0, 40);

    resultado.push({
      key,
      contraparte,
      valorMedio,
      type: lista[0].type,
      category: lista[0].category,
      occurrences: lista.length,
      monthsActive,
      intervalMedio: Math.round(intervalMedio),
      ultimaData,
      proximaPrevista,
      transactionIds: lista.map((t) => t.id),
    });
  }

  return resultado.sort((a, b) => Math.abs(b.valorMedio) - Math.abs(a.valorMedio));
}

/**
 * Aplica isRecurring=true em todas as transacoes que pertencem a algum grupo
 * recorrente. E false nas outras (caso o status mude).
 */
export async function marcarRecorrentes(userId: string): Promise<number> {
  const grupos = await detectarRecorrentes(userId);
  const idsRecorrentes = new Set(grupos.flatMap((g) => g.transactionIds));

  if (idsRecorrentes.size === 0) {
    // Garante que nada fica marcado errado
    await prisma.transaction.updateMany({
      where: { userId, isRecurring: true },
      data: { isRecurring: false },
    });
    return 0;
  }

  // Marca os ids como recorrentes
  await prisma.transaction.updateMany({
    where: { userId, id: { in: [...idsRecorrentes] } },
    data: { isRecurring: true },
  });

  // Desmarca os que nao sao mais
  await prisma.transaction.updateMany({
    where: {
      userId,
      isRecurring: true,
      id: { notIn: [...idsRecorrentes] },
    },
    data: { isRecurring: false },
  });

  return idsRecorrentes.size;
}
