/**
 * Detector e orquestrador de parsers de extrato.
 *
 * Recebe um arquivo (PDF, OFX ou CSV), identifica o tipo e
 * chama o parser correto. Funciona como ponto unico de entrada
 * pra processar qualquer extrato.
 */

import { parsePixPdf, type ParseResult } from './pdf-parser';
import { isOfxContent, parseOfx } from './ofx-parser';
import { isCsvContent, parseCsv } from './csv-parser';

export type FileFormat = 'pdf' | 'ofx' | 'csv' | 'unknown';

/**
 * Detecta o formato a partir do nome do arquivo + conteudo.
 */
export function detectFormat(fileName: string, headBytes: Buffer): FileFormat {
  const lower = fileName.toLowerCase();
  const sample = headBytes.toString('utf8', 0, Math.min(headBytes.length, 2000));

  // PDF tem assinatura "%PDF-"
  if (headBytes.length >= 4 && headBytes.slice(0, 4).toString() === '%PDF') {
    return 'pdf';
  }

  // Extensoes especificas (sem ambiguidade)
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.ofx') || lower.endsWith('.qfx')) return 'ofx';
  if (lower.endsWith('.csv')) return 'csv';

  // Pra .txt e desconhecido, decide pelo conteudo - OFX antes de CSV
  if (isOfxContent(sample)) return 'ofx';
  if (isCsvContent(sample)) return 'csv';

  if (lower.endsWith('.txt')) return 'csv'; // ultimo fallback

  return 'unknown';
}

/**
 * Funcao principal: recebe buffer + filename e retorna ParseResult.
 */
export async function parseAnyExtract(
  buffer: Buffer,
  fileName: string = 'extrato',
): Promise<ParseResult & { format: FileFormat }> {
  const format = detectFormat(fileName, buffer);

  switch (format) {
    case 'pdf': {
      const result = await parsePixPdf(buffer);
      return { ...result, format: 'pdf' };
    }
    case 'ofx': {
      const text = buffer.toString('utf8');
      const result = parseOfx(text);
      return { ...result, format: 'ofx' };
    }
    case 'csv': {
      // Tenta UTF-8 primeiro, depois Latin-1 (alguns bancos usam)
      let text = buffer.toString('utf8');
      // Se tem muito caractere de substituicao, tenta latin1
      if ((text.match(/�/g)?.length ?? 0) > 5) {
        text = buffer.toString('latin1');
      }
      const result = parseCsv(text);
      return { ...result, format: 'csv' };
    }
    default:
      throw new Error('Formato de arquivo nao reconhecido. Tente PDF, OFX ou CSV.');
  }
}
