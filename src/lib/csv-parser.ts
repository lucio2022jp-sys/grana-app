/**
 * Parser de CSV de extrato bancario.
 *
 * Cada banco usa formato proprio. Esse parser detecta o layout pelo cabecalho
 * e mapeia as colunas certas. Cobre os principais bancos brasileiros.
 *
 * Layouts conhecidos (data, valor, descricao):
 *  - Nubank:    Data,Valor,Identificador,Descricao
 *  - Inter:     Data Lancamento;Historico;Descricao;Valor;Saldo
 *  - Caixa:     Data Mov.;Nr. Documento;Historico;Valor;Saldo
 *  - Itau:      Data;Lancamento;Valor
 *  - Bradesco:  Data;Historico;Docto.;Credito;Debito;Saldo
 *  - BB:        "Data";"Lancamento";"Detalhamento Hist.";"Valor"
 *
 * Generico: detecta colunas que parecem data/valor/descricao.
 */

import { extrairDocumento, type ParsedTx, type ParseResult } from './pdf-parser';

export function isCsvContent(text: string): boolean {
  const sample = text.slice(0, 2000);
  // Tem pelo menos 2 linhas e separadores comuns
  const linhas = sample.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return false;
  const sep1 = linhas[0].split(/[,;\t]/).length;
  const sep2 = linhas[1].split(/[,;\t]/).length;
  return sep1 >= 3 && sep2 >= 3 && sep1 === sep2;
}

/**
 * Detecta o separador (vírgula, ponto-e-vírgula, tab).
 */
function detectSeparator(linha: string): string {
  const counts = {
    ';': (linha.match(/;/g) ?? []).length,
    ',': (linha.match(/,/g) ?? []).length,
    '\t': (linha.match(/\t/g) ?? []).length,
  };
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
}

/**
 * Quebra uma linha CSV respeitando aspas.
 */
function splitCsvLine(linha: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (inQuotes && linha[i + 1] === '"') {
        // Aspas escapadas
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result.map((s) => s.trim().replace(/^"|"$/g, ''));
}

/**
 * Detecta o banco pelo conteudo das primeiras linhas + cabecalho.
 */
function detectBankFromCsv(headers: string[], firstRow: string[], rawText: string): string {
  const t = rawText.toLowerCase();
  const headerStr = headers.join(' ').toLowerCase();

  if (t.includes('nubank') || headerStr.includes('identificador') && headerStr.includes('descricao')) return 'nubank';
  if (t.includes('banco inter') || headerStr.includes('data lancamento')) return 'inter';
  if (t.includes('caixa econ') || headerStr.includes('data mov') || headerStr.includes('nr. documento')) return 'caixa';
  if (t.includes('itau') || t.includes('itaú')) return 'itau';
  if (t.includes('bradesco')) return 'bradesco';
  if (t.includes('santander')) return 'santander';
  if (t.includes('banco do brasil') || (headerStr.includes('detalhamento hist'))) return 'bb';
  if (t.includes('btg')) return 'btg';
  if (t.includes('c6 bank') || t.includes('banco c6')) return 'c6';
  return 'generico';
}

/**
 * Mapeia indice das colunas relevantes no header.
 */
function mapColumns(headers: string[]): {
  dateIdx: number;
  amountIdx: number;
  descIdx: number;
  creditIdx?: number;
  debitIdx?: number;
} {
  const norm = headers.map((h) =>
    h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
  );

  // Ordem importa: data primeiro pra nao confundir "data lancamento" com "lancamento"
  const dateIdx = norm.findIndex((h) => /\bdata\b/.test(h));

  const amountIdx = norm.findIndex((h, i) => {
    if (i === dateIdx) return false;
    return /\bvalor\b|\bamount\b/.test(h);
  });

  // Descricao: prioriza historico/descricao, mas evita pegar a coluna de data
  const descIdx = norm.findIndex((h, i) => {
    if (i === dateIdx || i === amountIdx) return false;
    return /\b(historico|descricao|detalhamento|lancamento)\b/.test(h);
  });

  const creditIdx = norm.findIndex((h) => /\bcredito\b/.test(h));
  const debitIdx = norm.findIndex((h) => /\bdebito\b/.test(h));

  return {
    dateIdx: dateIdx >= 0 ? dateIdx : 0,
    amountIdx: amountIdx >= 0 ? amountIdx : -1,
    descIdx: descIdx >= 0 ? descIdx : 1,
    creditIdx: creditIdx >= 0 ? creditIdx : undefined,
    debitIdx: debitIdx >= 0 ? debitIdx : undefined,
  };
}

function parseDateBR(s: string): Date | null {
  if (!s) return null;
  // dd/mm/yyyy ou yyyy-mm-dd
  const m1 = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m1) {
    let year = parseInt(m1[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(m1[2], 10) - 1, parseInt(m1[1], 10), 12);
    return isNaN(d.getTime()) ? null : d;
  }
  const m2 = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m2) {
    const d = new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, parseInt(m2[3], 10), 12);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseValor(s: string): number | null {
  if (!s) return null;
  const cleaned = s
    .replace(/[R$\s]/g, '')
    .replace(/\.(?=\d{3})/g, '') // remove ponto de milhar
    .replace(',', '.');
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

export function parseCsv(text: string): ParseResult {
  // Remove BOM se houver
  const cleaned = text.replace(/^﻿/, '');
  const linhas = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) {
    return { bank: 'generico', transactions: [], rawTextSample: cleaned.slice(0, 1500) };
  }

  const sep = detectSeparator(linhas[0]);
  const headers = splitCsvLine(linhas[0], sep);
  const firstRow = splitCsvLine(linhas[1], sep);

  const bank = detectBankFromCsv(headers, firstRow, text);
  const cols = mapColumns(headers);

  const transactions: ParsedTx[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const cells = splitCsvLine(linhas[i], sep);
    if (cells.length < 2) continue;

    const date = parseDateBR(cells[cols.dateIdx] ?? '');
    if (!date) continue;

    let amount: number | null = null;
    if (cols.amountIdx >= 0) {
      amount = parseValor(cells[cols.amountIdx] ?? '');
    } else if (cols.creditIdx !== undefined && cols.debitIdx !== undefined) {
      const credito = parseValor(cells[cols.creditIdx] ?? '') ?? 0;
      const debito = parseValor(cells[cols.debitIdx] ?? '') ?? 0;
      amount = credito - debito;
    }
    if (amount === null || !isFinite(amount)) continue;

    const description = (cells[cols.descIdx] ?? '').slice(0, 200);

    // Tenta extrair contraparte do texto
    let contraparte: string | undefined;
    const m = description.match(/(?:de|para)\s+(.+?)(?:\s*-|\s*$|\s*CPF|\s*CNPJ)/i);
    if (m) contraparte = m[1].trim().slice(0, 80);

    const contraparteDoc = extrairDocumento(description);

    transactions.push({
      date,
      amount,
      description: description || 'Transacao',
      contraparte,
      contraparteDoc,
    });
  }

  return {
    bank,
    transactions,
    rawTextSample: cleaned.slice(0, 1500),
  };
}
