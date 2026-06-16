/**
 * Parser de arquivos OFX (Open Financial Exchange).
 *
 * OFX e o formato padrao internacional de extrato bancario. No Brasil,
 * Nubank, Inter, Itau, BB, Caixa, Bradesco, Santander - todos exportam.
 *
 * Tem 2 versoes:
 *  - SGML (1.x): mais antigo, tags sem fechamento, comum no Brasil
 *  - XML (2.x): tags fechadas estilo HTML
 *
 * Esse parser cobre as duas. Nao usa lib externa pra reduzir dependencias.
 */

import { extrairDocumento, type ParsedTx, type ParseResult } from './pdf-parser';

/**
 * Detecta se o conteudo parece OFX.
 */
export function isOfxContent(text: string): boolean {
  const sample = text.slice(0, 500).toUpperCase();
  return sample.includes('OFXHEADER') || sample.includes('<OFX>') || sample.includes('<STMTTRN>');
}

/**
 * Extrai valor de um campo OFX, lidando com SGML (sem fechamento) e XML (com).
 *
 * SGML: <TRNAMT>80.00\n<FITID>...
 * XML:  <TRNAMT>80.00</TRNAMT>
 */
function extractField(block: string, tag: string): string | null {
  // Tenta XML primeiro
  const xmlMatch = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i'));
  if (xmlMatch) return xmlMatch[1].trim();

  // SGML: pega ate \n ou proxima tag
  const sgmlMatch = block.match(new RegExp(`<${tag}>([^\\n<]*)`, 'i'));
  if (sgmlMatch) return sgmlMatch[1].trim();

  return null;
}

/**
 * Parse de data no formato OFX: YYYYMMDD ou YYYYMMDDHHMMSS ou YYYYMMDDHHMMSS[+/-NN:TZ]
 */
function parseOfxDate(s: string | null): Date | null {
  if (!s) return null;
  const cleaned = s.replace(/\[.*$/, '').trim(); // remove timezone
  const m = cleaned.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const hour = m[4] ? parseInt(m[4], 10) : 12;
  const minute = m[5] ? parseInt(m[5], 10) : 0;
  const second = m[6] ? parseInt(m[6], 10) : 0;
  const d = new Date(year, month, day, hour, minute, second);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Detecta o banco pelo conteudo OFX (campo BANKID, ORG, ou texto livre).
 */
function detectBankFromOfx(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('nubank') || t.includes('nu pagamentos') || /\bbankid\s*>\s*0260/.test(t)) return 'nubank';
  if (t.includes('inter') || /\bbankid\s*>\s*0077/.test(t)) return 'inter';
  if (t.includes('itau') || /\bbankid\s*>\s*0341/.test(t)) return 'itau';
  if (t.includes('bradesco') || /\bbankid\s*>\s*0237/.test(t)) return 'bradesco';
  if (t.includes('santander') || /\bbankid\s*>\s*0033/.test(t)) return 'santander';
  if (t.includes('caixa econ') || t.includes('cef') || /\bbankid\s*>\s*0104/.test(t)) return 'caixa';
  if (t.includes('banco do brasil') || /\bbankid\s*>\s*0001/.test(t)) return 'bb';
  if (t.includes('btg') || /\bbankid\s*>\s*0208/.test(t)) return 'btg';
  if (t.includes('c6') || /\bbankid\s*>\s*0336/.test(t)) return 'c6';
  return 'generico';
}

/**
 * Extrai contraparte da MEMO/NAME, removendo prefixos comuns
 * tipo "Pix recebido de " ou "Compra:".
 */
function extractContraparte(memo: string): string | undefined {
  if (!memo) return undefined;
  const m = memo
    .replace(/^pix (recebido|enviado|transferido)\s*(de|para)?\s*/i, '')
    .replace(/^(transferencia|ted|doc)\s*(de|para)?\s*/i, '')
    .replace(/^(compra|debito|pagamento)[:\s]+/i, '')
    .trim();
  return m.slice(0, 80) || undefined;
}

/**
 * Parser principal de OFX.
 */
export function parseOfx(text: string): ParseResult {
  // Remove headers OFXHEADER (texto antes do primeiro <OFX>)
  const ofxStart = text.indexOf('<OFX>');
  const content = ofxStart >= 0 ? text.slice(ofxStart) : text;

  const bank = detectBankFromOfx(text);
  const transactions: ParsedTx[] = [];

  // Pega todos os blocos <STMTTRN>...</STMTTRN> ou <STMTTRN>...<STMTTRN> (SGML)
  // Estrategia: split por <STMTTRN> e processa cada um
  const blocks = content.split(/<STMTTRN>/i).slice(1);

  for (const rawBlock of blocks) {
    // Termina o bloco no proximo </STMTTRN> ou no proximo <STMTTRN
    const block = rawBlock.split(/<\/STMTTRN>|<STMTTRN/i)[0];

    const trntype = extractField(block, 'TRNTYPE');
    const dtposted = extractField(block, 'DTPOSTED');
    const trnamt = extractField(block, 'TRNAMT');
    const memo = extractField(block, 'MEMO') ?? '';
    const name = extractField(block, 'NAME') ?? '';
    const fitid = extractField(block, 'FITID');

    if (!dtposted || !trnamt) continue;

    const date = parseOfxDate(dtposted);
    if (!date) continue;

    const amount = parseFloat(trnamt.replace(',', '.'));
    if (!isFinite(amount)) continue;

    // Descricao: usa NAME ou MEMO
    const descricao = (name || memo).slice(0, 200);
    const contraparte = extractContraparte(name || memo);
    // CPF/CNPJ pode aparecer no MEMO (ex: "Pix de FULANO CPF 123.456.789-00")
    const contraparteDoc = extrairDocumento(`${name} ${memo}`);

    transactions.push({
      date,
      amount,
      description: descricao || 'Transacao',
      contraparte,
      contraparteDoc,
    });
  }

  return {
    bank,
    transactions,
    rawTextSample: content.slice(0, 1500),
  };
}
