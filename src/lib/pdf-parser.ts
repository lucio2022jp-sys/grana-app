/**
 * Parser de extrato Pix em PDF.
 * Detecta o banco de origem e extrai as transacoes.
 *
 * Bancos suportados (heuristicas):
 *  - Nubank
 *  - Caixa Economica Federal
 *  - Banco Inter
 *  - Itau
 *  - Banco do Brasil
 *  - Generico (fallback baseado em valores monetarios)
 */

export type ParsedTx = {
  date: Date;
  amount: number; // positivo = entrada, negativo = saida
  description: string;
  contraparte?: string;
  contraparteDoc?: string; // CPF/CNPJ apenas digitos, quando aparece no extrato
};

export type ParseResult = {
  bank: string;
  transactions: ParsedTx[];
  rawTextSample: string;
};

const MONTHS_PT: Record<string, number> = {
  jan: 0, janeiro: 0,
  fev: 1, fevereiro: 1,
  mar: 2, marco: 2, 'março': 2,
  abr: 3, abril: 3,
  mai: 4, maio: 4,
  jun: 5, junho: 5,
  jul: 6, julho: 6,
  ago: 7, agosto: 7,
  set: 8, setembro: 8,
  out: 9, outubro: 9,
  nov: 10, novembro: 10,
  dez: 11, dezembro: 11,
};

function detectBank(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('nubank') || t.includes('nu pagamentos')) return 'nubank';
  if (t.includes('caixa econ') || t.includes('caixa economica')) return 'caixa';
  if (t.includes('banco inter')) return 'inter';
  if (t.includes('itau') || t.includes('itaú')) return 'itau';
  if (t.includes('banco do brasil')) return 'bb';
  if (t.includes('bradesco')) return 'bradesco';
  if (t.includes('santander')) return 'santander';
  if (t.includes('btg pactual') || t.includes('btg')) return 'btg';
  return 'generico';
}

function parseBRLAmount(s: string): number | null {
  // Aceita "1.234,56" ou "1234,56" ou "R$ 1.234,56"
  const cleaned = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

function parseDateBR(s: string): Date | null {
  // dd/mm/yyyy ou dd/mm/yy
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    let year = parseInt(m[3], 10);
    const month = parseInt(m[2], 10) - 1;
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // dd de mes de yyyy
  const m2 = s.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (m2) {
    const monthKey = m2[2].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const month = MONTHS_PT[monthKey];
    if (month !== undefined) {
      const d = new Date(parseInt(m2[3]), month, parseInt(m2[1]));
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

/**
 * Tenta extrair um documento (CPF ou CNPJ) do bloco de texto da transacao.
 * Retorna apenas digitos. Aceita formatos comuns:
 *   - CPF: 123.456.789-00 ou 12345678900
 *   - CNPJ: 12.345.678/0001-90 ou 12345678000190
 * Ignora documentos mascarados (ex: ***.456.789-** sao parciais e nao
 * servem como chave unica entre extratos).
 */
export function extrairDocumento(text: string): string | undefined {
  // CNPJ formatado primeiro (mais especifico, evita colidir com CPF mais curto)
  const cnpjFmt = text.match(/\b(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})\b/);
  if (cnpjFmt) return cnpjFmt.slice(1).join('');

  // CPF formatado
  const cpfFmt = text.match(/\b(\d{3})\.(\d{3})\.(\d{3})-(\d{2})\b/);
  if (cpfFmt) return cpfFmt.slice(1).join('');

  // CNPJ ou CPF puro (apenas digitos), com word-boundary pra evitar pegar
  // numero de telefone, valor, agencia/conta
  const puro = text.match(/(?:^|\s|CNPJ:?|CPF:?)\s*(\d{11}|\d{14})(?:\s|$|[^\d])/);
  if (puro) {
    const d = puro[1];
    if (d.length === 11 || d.length === 14) return d;
  }

  return undefined;
}

/**
 * Parser generico baseado em linhas com data + valor monetario.
 * Funciona razoavelmente bem na maior parte dos extratos brasileiros.
 */
function parseGeneric(text: string): ParsedTx[] {
  const lines = text.split(/\r?\n/);
  const transactions: ParsedTx[] = [];

  // Regex: captura data (dd/mm/aa[aa]) e valor monetario (R$ X.XXX,XX)
  const dateRegex = /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/;
  const amountRegex = /(-?\s*R?\$?\s*[\d.]+,\d{2})/g;

  let currentDate: Date | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentDate || buffer.length === 0) {
      buffer = [];
      return;
    }
    const blockText = buffer.join(' ');
    const amounts = blockText.match(amountRegex);
    if (!amounts || amounts.length === 0) {
      buffer = [];
      return;
    }

    // Pega o ultimo valor (geralmente o mais relevante numa linha de extrato)
    const lastAmountStr = amounts[amounts.length - 1];
    const amount = parseBRLAmount(lastAmountStr);
    if (amount === null) {
      buffer = [];
      return;
    }

    // Heuristica de sinal: se contem palavra "recebido", "credito", "entrada", e positivo
    // se contem "enviado", "debito", "pagamento", "saida", e negativo
    const t = blockText.toLowerCase();
    let signed = amount;

    const isCredit = /\b(recebid[oa]|credit[oa]|entrada|deposito|recebimento)\b/.test(t);
    const isDebit = /\b(enviad[oa]|debit[oa]|pagament[oa]|saida|saque|transferencia para|transferido)\b/.test(t);

    if (isDebit && !isCredit) signed = -Math.abs(amount);
    else if (isCredit && !isDebit) signed = Math.abs(amount);
    else if (lastAmountStr.includes('-')) signed = -Math.abs(amount);

    // Extrai contraparte: nome em CAIXA ALTA ou apos "para"/"de"
    let contraparte: string | undefined;
    const paraMatch = blockText.match(/(?:para|de)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\w\sÁ-ú]+?)(?:\s+R\$|\s+CPF|\s+CNPJ|$)/);
    if (paraMatch) contraparte = paraMatch[1].trim().slice(0, 60);

    // Extrai CPF/CNPJ se aparecer no bloco
    const contraparteDoc = extrairDocumento(blockText);

    // Descricao limpa
    const description = blockText.replace(amountRegex, '').replace(dateRegex, '').replace(/\s+/g, ' ').trim().slice(0, 200);

    transactions.push({
      date: currentDate,
      amount: signed,
      description: description || 'Transacao',
      contraparte,
      contraparteDoc,
    });

    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      const newDate = parseDateBR(dateMatch[1]);
      if (newDate) {
        // Nova data, fecha o bloco anterior
        flush();
        currentDate = newDate;
      }
    }
    buffer.push(line);
  }
  flush();

  return transactions;
}

/**
 * Heuristica especifica do Nubank.
 * Padrao: cada transacao em bloco com "Transferencia recebida"/"Transferencia enviada",
 * data, valor, e nome da contraparte.
 */
function parseNubank(text: string): ParsedTx[] {
  // Por enquanto usa generico; no futuro podemos refinar
  return parseGeneric(text);
}

/**
 * Funcao principal exportada
 */
export async function parsePixPdf(buffer: Buffer): Promise<ParseResult> {
  // Import dinamico pra evitar problemas de bundler
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  const text = data.text || '';

  const bank = detectBank(text);

  let transactions: ParsedTx[] = [];
  switch (bank) {
    case 'nubank':
      transactions = parseNubank(text);
      break;
    default:
      transactions = parseGeneric(text);
  }

  return {
    bank,
    transactions,
    rawTextSample: text.slice(0, 1500),
  };
}

/**
 * Parser pra texto colado direto (caso de teste/demo)
 */
export function parsePixText(text: string): ParseResult {
  const bank = detectBank(text);
  return {
    bank,
    transactions: parseGeneric(text),
    rawTextSample: text.slice(0, 1500),
  };
}
