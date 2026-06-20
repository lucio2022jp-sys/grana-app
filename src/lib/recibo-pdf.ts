/**
 * Gerador de PDF de recibo de pagamento.
 *
 * IMPORTANTE: recibo NAO e nota fiscal. O PDF tem aviso bem visivel
 * no topo informando isso, pra proteger a usuaria e nao induzir o
 * cliente a confundir os dois documentos.
 *
 * Estrutura: 1 pagina A4 simples com:
 *  - Aviso "NAO E NOTA FISCAL"
 *  - Numero do recibo + data
 *  - Dados do emissor (MEI)
 *  - Dados do cliente
 *  - Valor por extenso
 *  - Descricao do servico/produto
 *  - Linha de assinatura
 *  - Rodape com URL do app
 */

import jsPDF from 'jspdf';

const COR_PRIMARIA: [number, number, number] = [139, 92, 246];
const COR_AMARELO: [number, number, number] = [251, 191, 36];
const COR_TEXTO: [number, number, number] = [31, 41, 55];
const COR_CINZA: [number, number, number] = [107, 114, 128];

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(d: string | Date): string {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Converte um numero em valor por extenso (pt-BR), ate centavos.
 * Implementacao simples — cobre ate 999.999,99.
 */
function valorPorExtenso(n: number): string {
  if (n === 0) return 'zero reais';

  const unidades = [
    '', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete',
    'dezoito', 'dezenove',
  ];
  const dezenas = [
    '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta',
    'oitenta', 'noventa',
  ];
  const centenas = [
    '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
  ];

  function ate999(num: number): string {
    if (num === 0) return '';
    if (num === 100) return 'cem';
    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;
    const partes: string[] = [];
    if (c > 0) partes.push(centenas[c]);
    if (num % 100 < 20) {
      if (num % 100 > 0) partes.push(unidades[num % 100]);
    } else {
      if (d > 0) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }
    return partes.join(' e ');
  }

  const inteiros = Math.floor(n);
  const centavos = Math.round((n - inteiros) * 100);

  const milhar = Math.floor(inteiros / 1000);
  const resto = inteiros % 1000;

  const partes: string[] = [];
  if (milhar > 0) {
    if (milhar === 1) partes.push('mil');
    else partes.push(`${ate999(milhar)} mil`);
  }
  if (resto > 0) {
    if (milhar > 0 && resto < 100) partes.push('e');
    partes.push(ate999(resto));
  }

  let texto = partes.join(' ').trim();
  texto += inteiros === 1 ? ' real' : ' reais';

  if (centavos > 0) {
    texto += ` e ${ate999(centavos)} centavo${centavos === 1 ? '' : 's'}`;
  }

  return texto;
}

function formatDoc(doc: string | null | undefined): string | null {
  if (!doc) return null;
  const d = doc.replace(/\D/g, '');
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
}

export type ReciboData = {
  numero: number;
  data: string | Date;
  valor: number;
  descricao: string;
  emissor: {
    nome: string;
    doc?: string | null;
    profissao?: string | null;
    cidade?: string | null;
  };
  cliente: {
    nome: string;
    doc?: string | null;
    contato?: string | null;
  };
};

export function gerarReciboPDF(d: ReciboData): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 40;

  // Aviso bem visivel: NAO e nota fiscal
  doc.setFillColor(...COR_AMARELO);
  doc.roundedRect(40, y, W - 80, 30, 6, 6, 'F');
  doc.setTextColor(...COR_TEXTO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    '⚠ ESTE E UM RECIBO DE PAGAMENTO. NAO SUBSTITUI NOTA FISCAL.',
    W / 2,
    y + 19,
    { align: 'center' },
  );
  y += 50;

  // Titulo
  doc.setTextColor(...COR_PRIMARIA);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO', W / 2, y + 10, { align: 'center' });
  y += 25;

  // Numero + valor
  doc.setTextColor(...COR_CINZA);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`No ${String(d.numero).padStart(4, '0')}`, 40, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COR_PRIMARIA);
  doc.text(brl(d.valor), W - 40, y, { align: 'right' });
  y += 25;

  // Linha separadora
  doc.setDrawColor(...COR_CINZA);
  doc.setLineWidth(0.5);
  doc.line(40, y, W - 40, y);
  y += 30;

  // Texto principal — formato de declaracao
  doc.setTextColor(...COR_TEXTO);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const valorExtenso = valorPorExtenso(d.valor);
  const docCli = formatDoc(d.cliente.doc);
  const docEmi = formatDoc(d.emissor.doc);

  const texto =
    `Recebi de ${d.cliente.nome}` +
    (docCli ? `, portador(a) do documento ${docCli},` : ',') +
    ` a importancia de ${brl(d.valor)} (${valorExtenso}),` +
    ` referente a ${d.descricao.toLowerCase()}.`;

  // text wrap manual
  const linhas = doc.splitTextToSize(texto, W - 80);
  doc.text(linhas, 40, y);
  y += linhas.length * 16 + 30;

  // Texto de quitacao
  doc.setFont('helvetica', 'normal');
  const quitacao = doc.splitTextToSize(
    `Para clareza firmo o presente recibo, dando plena, geral e irrevogavel quitacao do valor mencionado.`,
    W - 80,
  );
  doc.text(quitacao, 40, y);
  y += quitacao.length * 16 + 40;

  // Local e data
  const cidade = d.emissor.cidade ?? '_______________';
  doc.text(`${cidade}, ${fmtData(d.data)}.`, 40, y);
  y += 60;

  // Linha de assinatura
  const assX = (W - 280) / 2;
  doc.setDrawColor(...COR_TEXTO);
  doc.setLineWidth(0.8);
  doc.line(assX, y, assX + 280, y);
  doc.setFontSize(10);
  doc.setTextColor(...COR_CINZA);
  doc.text(d.emissor.nome, W / 2, y + 14, { align: 'center' });
  if (docEmi) {
    doc.text(docEmi, W / 2, y + 28, { align: 'center' });
  }
  if (d.emissor.profissao) {
    doc.text(d.emissor.profissao, W / 2, y + 42, { align: 'center' });
  }

  // Rodape
  doc.setFontSize(8);
  doc.setTextColor(...COR_CINZA);
  doc.text(
    'Recibo gerado pelo Grana - app de gestao financeira pra MEI',
    W / 2,
    doc.internal.pageSize.getHeight() - 30,
    { align: 'center' },
  );

  return doc;
}
