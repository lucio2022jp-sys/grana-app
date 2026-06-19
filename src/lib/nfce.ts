/**
 * Parser de NFC-e a partir do conteudo do QR Code.
 *
 * Toda NFC-e (modelo 65) traz um QR cuja URL aponta pra consulta publica da
 * SEFAZ do estado emitente. Os 14 digitos depois do "p=" (ou "chNFe=") sao a
 * chave de acesso, e os 2 primeiros digitos identificam a UF.
 *
 * Fluxo:
 *   1. extrai chave + UF da URL escaneada;
 *   2. faz GET na propria URL (segue redirects), pega o HTML da pagina publica
 *      da consulta;
 *   3. roda um parser generico em cima do HTML (todos os portais SEFAZ usam
 *      tabelas/divs com rotulos parecidos: "Valor a pagar", "CNPJ Emitente",
 *      lista de itens com qtd/un/total).
 *
 * Por que nao IA: as paginas sao publicas e estaveis o suficiente, e a gente
 * quer uma feature que funcione offline-cost-zero. Quando o parser nao acha
 * total/itens, a gente devolve {fallback: true} pra caller decidir (cair pra
 * IA visao da foto, por exemplo).
 *
 * Tabela UF: codigo IBGE -> sigla.
 */

import * as cheerio from 'cheerio';

const UF_BY_CODE: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

export type NfceItem = {
  descricao: string;
  quantidade: number;
  unidade?: string;
  valorTotal: number;
};

export type NfceParsed = {
  chave: string;
  uf: string;
  emitente?: { cnpj?: string; nome?: string };
  emitidaEm?: string; // ISO
  total?: number;
  itens: NfceItem[];
  /** true quando nao conseguimos extrair total/itens com confianca. */
  fallback: boolean;
  /** url consultada na SEFAZ. */
  sourceUrl: string;
};

/** Pega chave (44 digitos) e UF (2 primeiros digitos) de uma URL de QR. */
export function parseQrUrl(raw: string): { chave: string; uf: string; url: string } | null {
  // Algumas leitoras devolvem string com espacos, normaliza.
  const trimmed = raw.trim();

  // Padrao mais comum: ?p=44digitos|... ou &chNFe=44digitos
  const m =
    trimmed.match(/[?&](?:p|chNFe|chave)=(\d{44})/i) ||
    trimmed.match(/(\d{44})/);
  if (!m) return null;

  const chave = m[1];
  const ufCode = chave.slice(0, 2);
  const uf = UF_BY_CODE[ufCode];
  if (!uf) return null;

  // Garante que e uma URL minimamente valida pra consulta. Se vier so a chave,
  // nao da pra montar URL — caller decide o que fazer.
  let url = trimmed;
  try {
    new URL(trimmed);
  } catch {
    return null;
  }
  return { chave, uf, url };
}

/** Limpa "R$ 1.234,56" -> 1234.56. Retorna null em caso de string invalida. */
function brlToNumber(s: string | undefined | null): number | null {
  if (!s) return null;
  const cleaned = s
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '') // tira separador de milhar
    .replace(',', '.');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Heuristica generica para extrair os dados da NFC-e de qualquer SEFAZ.
 * Os portais tem layouts diferentes mas todos usam rotulos parecidos.
 */
function extractFromHtml(html: string): Pick<NfceParsed, 'emitente' | 'emitidaEm' | 'total' | 'itens' | 'fallback'> {
  const $ = cheerio.load(html);
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  // CNPJ do emitente: aparece como "CNPJ: 00.000.000/0000-00".
  const cnpjMatch = text.match(/CNPJ[:\s]*([\d./-]{14,18})/i);
  const cnpj = cnpjMatch ? cnpjMatch[1].replace(/\D/g, '') : undefined;

  // Nome fantasia/razao: rotulo "Nome / Razao Social" ou primeiro <h4>/<h1>.
  let nome: string | undefined;
  const nomeLabel = text.match(/(?:Nome\s*\/?\s*Raz[aã]o(?:\s*Social)?|Emitente)[:\s-]+([^,;|]{3,80})/i);
  if (nomeLabel) nome = nomeLabel[1].trim();
  if (!nome) {
    const h = $('h1, h2, h3, h4').first().text().trim();
    if (h && h.length < 80) nome = h;
  }

  // Total: priorizar "Valor a Pagar" / "Valor Total" / "Total a Pagar".
  let total: number | null = null;
  const totalRegexes = [
    /Valor\s+a\s+Pagar[^\d]*([\d.,]+)/i,
    /Total\s+a\s+Pagar[^\d]*([\d.,]+)/i,
    /Valor\s+Total[^\d]*([\d.,]+)/i,
    /Vl\.\s*Total[^\d]*([\d.,]+)/i,
  ];
  for (const re of totalRegexes) {
    const m = text.match(re);
    if (m) {
      total = brlToNumber(m[1]);
      if (total) break;
    }
  }

  // Data: "Emissao: 19/06/2026 14:32" ou "Data de Emissao".
  let emitidaEm: string | undefined;
  const dataMatch = text.match(/(?:Emiss[aã]o|Data\s+de\s+Emiss[aã]o)[:\s-]+(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/i);
  if (dataMatch) {
    const [d, m, rest] = dataMatch[1].split('/');
    const [y, hms] = (rest || '').split(/\s+/);
    if (d && m && y) {
      const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hms || '00:00:00'}`;
      const dt = new Date(iso);
      if (!Number.isNaN(dt.getTime())) emitidaEm = dt.toISOString();
    }
  }

  // Itens: percorre tabelas tentando encontrar linhas com "qtd | un | total".
  // A maioria dos portais tem uma tabela com classe relacionada a "produto" ou
  // simplesmente tr's com 4-5 colunas. A gente tenta o mais resiliente possivel.
  const itens: NfceItem[] = [];
  $('table tr').each((_, tr) => {
    const cells = $(tr)
      .find('td')
      .map((_i, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get();
    if (cells.length < 3) return;

    // Procura uma celula numerica que parece total (BRL com virgula).
    const totalCellIdx = cells.findIndex((c, i) => i > 0 && /R?\$?\s*[\d.]+,\d{2}/.test(c));
    if (totalCellIdx === -1) return;
    const totalItem = brlToNumber(cells[totalCellIdx]);
    if (!totalItem) return;

    const qtdCell = cells.find((c) => /Qtde|Qtd/i.test(c)) || cells.find((c) => /^\d+([.,]\d+)?$/.test(c));
    const qtd = brlToNumber(qtdCell?.replace(/[^\d,.-]/g, '')) ?? 1;

    // Descricao: primeira celula textual significativa.
    const descricao =
      cells.find((c, i) => i !== totalCellIdx && c.length > 3 && !/^\d+([.,]\d+)?$/.test(c)) ||
      cells[0] ||
      '';
    if (!descricao) return;

    itens.push({
      descricao: descricao.slice(0, 120),
      quantidade: qtd,
      valorTotal: totalItem,
    });
  });

  const fallback = total == null && itens.length === 0;

  return {
    emitente: cnpj || nome ? { cnpj, nome } : undefined,
    emitidaEm,
    total: total ?? undefined,
    itens,
    fallback,
  };
}

/**
 * Busca o HTML publico da consulta SEFAZ para a URL do QR e extrai os dados.
 * Nao lanca em rede falha — devolve fallback=true quando nao consegue.
 */
export async function fetchAndParseNfce(qrContent: string): Promise<NfceParsed | null> {
  const parsed = parseQrUrl(qrContent);
  if (!parsed) return null;
  const { chave, uf, url } = parsed;

  let html = '';
  try {
    const res = await fetch(url, {
      // Timeout-ish via AbortSignal: 10s eh confortavel pra portal lento.
      signal: AbortSignal.timeout(10_000),
      // Alguns portais (PR, MG) bloqueiam UA vazio.
      headers: { 'User-Agent': 'Mozilla/5.0 GranaApp/1.0 (+https://grana.app)' },
      redirect: 'follow',
    });
    if (!res.ok) {
      return { chave, uf, itens: [], fallback: true, sourceUrl: url };
    }
    html = await res.text();
  } catch {
    return { chave, uf, itens: [], fallback: true, sourceUrl: url };
  }

  const extracted = extractFromHtml(html);
  return {
    chave,
    uf,
    sourceUrl: url,
    ...extracted,
  };
}
