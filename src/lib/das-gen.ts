/**
 * Geracao de DAS (codigo Pix copia-cola e linha digitavel).
 *
 * IMPORTANTE: a Receita Federal nao oferece API publica gratuita pra gerar DAS.
 * Pra gerar DAS oficial em producao voce precisa de:
 *
 *  1. Conta no InfoSimples (https://infosimples.com/) ou similar (Migrate, Plug Notas).
 *     - Custa R$ 0,50–2,00 por DAS gerado.
 *     - Configure DAS_PROVIDER_API_KEY no .env
 *
 *  2. OU certificado digital A1/A3 + integracao com SOAP da Receita.
 *     - Custa R$ 200-500/ano + bastante codigo.
 *
 *  Sem isso configurado, o app cai em modo "demo": gera um Pix com chave aleatoria
 *  e copia-cola valido pelo formato (BR Code), porem o pagamento NAO chega na
 *  Receita Federal. Util pra testar UI mas nao serve pra producao.
 *
 *  Pra MVP: deixe demo ativo + linke pro PGMEI oficial pro pagamento real.
 *  Quando tiver tracao, plugue uma API paga.
 */

import crypto from 'crypto';

export type DASCodigo = {
  pixCopiaCola: string;       // texto do Pix (BR Code) pra copiar
  qrCodeData: string;          // texto que vira no QR Code
  linhaDigitavel?: string;     // boleto bancario (linha digitavel) - opcional
  codigoBarras?: string;       // codigo de barras
  isDemo: boolean;             // true se for fallback demo
  expiresAt?: string;
};

/**
 * Calcula CRC16-CCITT do BR Code (Pix).
 */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formata um campo do BR Code: ID(2) + Length(2) + Value
 */
function field(id: string, value: string): string {
  return id + value.length.toString().padStart(2, '0') + value;
}

/**
 * Gera um BR Code (payload Pix) demo.
 * Estrutura segue padrao Banco Central, mas a chave e ficticia.
 */
function gerarPixDemo(valor: number, descricao: string): string {
  const merchantName = 'GRANA APP';
  const merchantCity = 'SAO PAULO';
  const txid = crypto.randomBytes(8).toString('hex').toUpperCase();
  const pixKey = '00020126demo@grana.app'; // chave fake

  const payload =
    field('00', '01') +
    field('01', '12') +
    field('26',
      field('00', 'BR.GOV.BCB.PIX') +
      field('01', 'demo@grana.app')
    ) +
    field('52', '0000') +
    field('53', '986') +
    field('54', valor.toFixed(2)) +
    field('58', 'BR') +
    field('59', merchantName.slice(0, 25)) +
    field('60', merchantCity.slice(0, 15)) +
    field('62', field('05', txid));

  const toHash = payload + '6304';
  const crc = crc16(toHash);
  return toHash + crc;
}

/**
 * Tenta gerar DAS via API externa (InfoSimples).
 * Retorna null se nao tiver chave configurada.
 */
async function gerarViaInfoSimples(opts: {
  cnpj?: string;
  month: number;
  year: number;
}): Promise<DASCodigo | null> {
  const apiKey = process.env.DAS_PROVIDER_API_KEY;
  if (!apiKey) return null;

  // Esqueleto da chamada - ajustar conforme servico que voce escolher.
  // InfoSimples docs: https://api.infosimples.com/docs/
  try {
    const res = await fetch('https://api.infosimples.com/api/v2/consultas/receita-federal/pgmei', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: apiKey,
        cnpj: opts.cnpj,
        periodo_apuracao: `${opts.year}${String(opts.month).padStart(2, '0')}`,
        timeout: 600,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data?.code !== 200 || !data?.data?.[0]) return null;
    const r = data.data[0];

    return {
      pixCopiaCola: r.pix_copia_cola ?? '',
      qrCodeData: r.qr_code ?? r.pix_copia_cola ?? '',
      linhaDigitavel: r.linha_digitavel,
      codigoBarras: r.codigo_barras,
      isDemo: false,
      expiresAt: r.data_vencimento,
    };
  } catch (err) {
    console.error('Erro ao gerar DAS via InfoSimples:', err);
    return null;
  }
}

/**
 * Funcao principal: tenta provedor real, cai pra demo.
 */
export async function gerarDAS(opts: {
  valor: number;
  month: number;
  year: number;
  cnpj?: string;
  descricao?: string;
}): Promise<DASCodigo> {
  // Tenta provedor real
  const real = await gerarViaInfoSimples({
    cnpj: opts.cnpj,
    month: opts.month,
    year: opts.year,
  });

  if (real) return real;

  // Fallback demo
  const descricao = opts.descricao ?? `DAS ${opts.month}/${opts.year}`;
  const pix = gerarPixDemo(opts.valor, descricao);

  return {
    pixCopiaCola: pix,
    qrCodeData: pix,
    isDemo: true,
  };
}
