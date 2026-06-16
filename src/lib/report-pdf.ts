/**
 * Geracao de PDF de relatorio mensal pro contador.
 *
 * Usa jsPDF + autotable. Renderiza no navegador (client-side),
 * entao nao tem custo de servidor.
 *
 * Estrutura do PDF:
 *  - Capa com identificacao do cliente e periodo
 *  - Pagina 1: Resumo executivo (cards de receita/despesa/lucro/MEI)
 *  - Pagina 2: Receitas detalhadas (tabela)
 *  - Pagina 3: Despesas dedutiveis (tabela + por categoria)
 *  - Pagina 4: Movimentos nao operacionais (retiradas, investimentos, etc.)
 *  - Pagina 5: DAS e observacoes
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COR_PRIMARIA: [number, number, number] = [139, 92, 246]; // roxo
const COR_VERDE: [number, number, number] = [16, 185, 129];
const COR_LARANJA: [number, number, number] = [249, 115, 22];
const COR_VERMELHO: [number, number, number] = [239, 68, 68];
const COR_CINZA: [number, number, number] = [107, 114, 128];
const COR_TEXTO: [number, number, number] = [31, 41, 55];

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(d: string | Date): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtDataLonga(d: string | Date): string {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function regimeLabel(regime?: string | null): string {
  if (regime === 'mei') return 'MEI';
  if (regime === 'simples') return 'Simples Nacional';
  return 'Autonomo';
}

function profissaoLabel(p?: string | null): string {
  const map: Record<string, string> = {
    manicure: 'Manicure', cabelo: 'Cabeleireiro(a)', estetica: 'Estetica',
    massagem: 'Massagem', maquiagem: 'Maquiadora', motorista: 'Motorista de app',
    entregador: 'Entregador', professor: 'Professor', personal: 'Personal Trainer',
    faxineira: 'Diarista', cozinheira: 'Cozinheira', freelancer: 'Freelancer',
    dev: 'Programador', fotografo: 'Fotografo', creator: 'Criador de conteudo',
    costureira: 'Costureira', mecanico: 'Mecanico', vendedor: 'Vendedor',
  };
  return map[p ?? ''] ?? 'Autonomo';
}

export type RelatorioData = any; // tipo conforme a API /api/relatorio

export function gerarRelatorioPDF(d: RelatorioData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.width;
  const h = doc.internal.pageSize.height;
  let y = 0;

  // ============== CAPA ==============
  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, w, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATORIO MENSAL', w / 2, 30, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(`${MESES_PT[d.period.month - 1]} ${d.period.year}`, w / 2, 42, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Gerado pelo app Grana', w / 2, 55, { align: 'center' });
  doc.text(fmtDataLonga(d.geradoEm), w / 2, 62, { align: 'center' });

  // Info do cliente
  doc.setTextColor(...COR_TEXTO);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', 20, 100);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(20);
  doc.text(d.user.name ?? 'Sem nome cadastrado', 20, 110);

  doc.setFontSize(11);
  doc.setTextColor(...COR_CINZA);
  doc.text(`${profissaoLabel(d.user.profissao)} · ${regimeLabel(d.user.regime)}`, 20, 118);

  // Resumo executivo na capa
  y = 140;
  doc.setFontSize(13);
  doc.setTextColor(...COR_TEXTO);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO EXECUTIVO', 20, y);

  y += 8;
  // 3 cards lado a lado
  const cardW = (w - 40 - 10) / 3;

  const cards = [
    { label: 'Receita', valor: brl(d.totals.receita), cor: COR_VERDE },
    { label: 'Despesas', valor: brl(d.totals.despesa), cor: COR_LARANJA },
    { label: 'Lucro liquido', valor: brl(d.totals.lucroLiquido), cor: COR_PRIMARIA },
  ];

  cards.forEach((c, i) => {
    const x = 20 + i * (cardW + 5);
    doc.setFillColor(...c.cor);
    doc.roundedRect(x, y, cardW, 28, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(c.label.toUpperCase(), x + 4, y + 8);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(c.valor, x + 4, y + 20);
  });

  y += 38;
  doc.setTextColor(...COR_TEXTO);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Total de transacoes: ${d.counts.total}`, 20, y);
  y += 6;
  doc.text(`Limite MEI utilizado: ${d.mei.meiPercent}% (${brl(d.mei.yearReceita)} de ${brl(d.mei.limite)})`, 20, y);
  y += 6;

  const saudeLabel = {
    saudavel: 'Saudavel',
    atencao: 'Atencao',
    risco: 'Risco fiscal',
    sem_dados: 'Sem dados',
  }[d.saude.nivel as string] ?? 'N/A';
  doc.text(`Saude PF/PJ: ${saudeLabel} (${d.saude.percentPessoal}% pessoal)`, 20, y);
  y += 6;

  if (d.das.pagoNoMes) {
    doc.text(`DAS pago: ${brl(d.das.pagoNoMes.value)} em ${fmtDataLonga(d.das.pagoNoMes.paidAt)}`, 20, y);
    y += 6;
  }
  if (d.das.proximo) {
    doc.text(`Proximo DAS: ${brl(d.das.proximo.value)} vence ${fmtDataLonga(d.das.proximo.dueDate)}`, 20, y);
  }

  // Footer da capa
  doc.setFontSize(8);
  doc.setTextColor(...COR_CINZA);
  doc.text('Documento gerado automaticamente. Confirmar com contador antes de fechar exercicio.', w / 2, h - 15, { align: 'center' });

  // ============== PAGINA 2 - RECEITAS ==============
  if (d.receitas.length > 0) {
    doc.addPage();
    y = pageHeader(doc, 'RECEITAS', d, w);

    doc.setTextColor(...COR_TEXTO);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${d.receitas.length} ${d.receitas.length === 1 ? 'recebimento' : 'recebimentos'} totalizando ${brl(d.totals.receita)}`, 20, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Data', 'Cliente / Origem', 'Valor']],
      body: d.receitas.map((t: any) => [
        fmtData(t.date),
        t.contraparte ?? t.description.slice(0, 40),
        brl(t.amount),
      ]),
      headStyles: { fillColor: COR_VERDE, textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
      foot: [['', 'TOTAL', brl(d.totals.receita)]],
      footStyles: { fillColor: [240, 253, 244], textColor: COR_VERDE, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
    });

    // Top clientes
    if (d.topClientes.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY ?? y + 50;
      y = finalY + 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COR_TEXTO);
      doc.text('Top clientes', 20, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['#', 'Cliente', 'Recebimentos', 'Total']],
        body: d.topClientes.slice(0, 10).map((c: any, i: number) => [
          (i + 1).toString(),
          c.nome,
          c.count.toString(),
          brl(c.total),
        ]),
        headStyles: { fillColor: COR_PRIMARIA, textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 3: { halign: 'right' } },
        margin: { left: 20, right: 20 },
      });
    }
  }

  // ============== PAGINA 3 - DESPESAS ==============
  if (d.despesas.length > 0) {
    doc.addPage();
    y = pageHeader(doc, 'DESPESAS DEDUTIVEIS', d, w);

    doc.setTextColor(...COR_TEXTO);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${d.despesas.length} ${d.despesas.length === 1 ? 'despesa' : 'despesas'} totalizando ${brl(d.totals.despesa)}`, 20, y);
    y += 8;

    // Por categoria
    if (d.despesasPorCategoria.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Por categoria', 20, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Categoria', 'Quantidade', 'Total']],
        body: d.despesasPorCategoria.map((c: any) => [
          c.categoria.replace('_', ' '),
          c.count.toString(),
          brl(c.total),
        ]),
        headStyles: { fillColor: COR_LARANJA, textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 20, right: 20 },
      });

      const finalY = (doc as any).lastAutoTable?.finalY ?? y + 50;
      y = finalY + 10;
    }

    // Detalhamento
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento', 20, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Data', 'Fornecedor / Descricao', 'Categoria', 'Valor']],
      body: d.despesas.map((t: any) => [
        fmtData(t.date),
        (t.contraparte ?? t.description).slice(0, 35),
        t.category.replace('_', ' '),
        brl(Math.abs(t.amount)),
      ]),
      headStyles: { fillColor: COR_LARANJA, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
      foot: [['', '', 'TOTAL', brl(d.totals.despesa)]],
      footStyles: { fillColor: [255, 247, 237], textColor: COR_LARANJA, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
    });
  }

  // ============== PAGINA 4 - MOVIMENTOS NAO OPERACIONAIS ==============
  const temNaoOperacional =
    d.retiradas.length > 0 || d.investimentos.length > 0 ||
    d.emprestimos.length > 0 || d.transferencias.length > 0 ||
    d.pessoais.length > 0;

  if (temNaoOperacional) {
    doc.addPage();
    y = pageHeader(doc, 'MOVIMENTOS NAO OPERACIONAIS', d, w);

    doc.setTextColor(...COR_TEXTO);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Estes valores NAO entram no calculo de lucro nem no faturamento bruto.', 20, y);
    y += 8;

    if (d.retiradas.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COR_TEXTO);
      doc.text(`Retiradas (${d.retiradas.length})`, 20, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Descricao', 'Valor']],
        body: d.retiradas.map((t: any) => [
          fmtData(t.date),
          (t.description).slice(0, 60),
          brl(Math.abs(t.amount)),
        ]),
        headStyles: { fillColor: [147, 51, 234], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 2: { halign: 'right' } },
        foot: [['', 'Total retiradas', brl(d.totals.retirada)]],
        footStyles: { fillColor: [243, 232, 255], textColor: [147, 51, 234], fontStyle: 'bold' },
        margin: { left: 20, right: 20 },
      });
      y = (doc as any).lastAutoTable?.finalY + 8;
    }

    if (d.investimentos.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Investimentos (${d.investimentos.length})`, 20, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Descricao', 'Valor']],
        body: d.investimentos.map((t: any) => [
          fmtData(t.date),
          t.description.slice(0, 60),
          brl(t.amount),
        ]),
        headStyles: { fillColor: [6, 182, 212], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 2: { halign: 'right' } },
        margin: { left: 20, right: 20 },
      });
      y = (doc as any).lastAutoTable?.finalY + 8;
    }

    if (d.emprestimos.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Emprestimos (${d.emprestimos.length})`, 20, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Descricao', 'Valor']],
        body: d.emprestimos.map((t: any) => [
          fmtData(t.date),
          t.description.slice(0, 60),
          brl(t.amount),
        ]),
        headStyles: { fillColor: [20, 184, 166], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 2: { halign: 'right' } },
        margin: { left: 20, right: 20 },
      });
      y = (doc as any).lastAutoTable?.finalY + 8;
    }

    if (d.pessoais.length > 0) {
      // Pagina pode estar cheia, adicionar nova
      if (y > h - 50) { doc.addPage(); y = pageHeader(doc, 'GASTOS PESSOAIS', d, w); }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COR_VERMELHO);
      doc.text(`⚠ Gastos pessoais na conta da empresa (${d.pessoais.length})`, 20, y);
      doc.setTextColor(...COR_TEXTO);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Descricao', 'Categoria', 'Valor']],
        body: d.pessoais.map((t: any) => [
          fmtData(t.date),
          (t.contraparte ?? t.description).slice(0, 35),
          t.category.replace('_', ' '),
          brl(Math.abs(t.amount)),
        ]),
        headStyles: { fillColor: COR_VERMELHO, textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 3: { halign: 'right' } },
        foot: [['', '', 'Total', brl(d.totals.pessoal)]],
        footStyles: { fillColor: [254, 226, 226], textColor: COR_VERMELHO, fontStyle: 'bold' },
        margin: { left: 20, right: 20 },
      });
    }
  }

  // ============== PAGINA FINAL - OBSERVACOES ==============
  doc.addPage();
  y = pageHeader(doc, 'OBSERVACOES E PENDENCIAS', d, w);

  doc.setTextColor(...COR_TEXTO);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const obs: string[] = [];
  obs.push(`Limite MEI ${d.period.year}: ${d.mei.meiPercent}% utilizado (${brl(d.mei.yearReceita)} de ${brl(d.mei.limite)}).`);

  if (d.mei.meiPercent > 90) {
    obs.push('ATENCAO: Cliente perto de estourar limite MEI. Avaliar migracao pra Simples Nacional.');
  } else if (d.mei.meiPercent > 70) {
    obs.push('Atencao: limite MEI passou de 70%. Acompanhar mensalmente.');
  }

  if (d.saude.nivel === 'risco') {
    obs.push(`Saude PF/PJ em RISCO: ${d.saude.percentPessoal}% das saidas sao gastos pessoais. Recomenda-se conta separada.`);
  } else if (d.saude.nivel === 'atencao') {
    obs.push(`Saude PF/PJ em atencao: ${d.saude.percentPessoal}% pessoal. Vale acompanhar.`);
  }

  if (d.das.pagoNoMes) {
    obs.push(`DAS de ${MESES_PT[d.das.pagoNoMes.month - 1]} ${d.das.pagoNoMes.year} (${brl(d.das.pagoNoMes.value)}) pago em ${fmtDataLonga(d.das.pagoNoMes.paidAt)}.`);
  }

  if (d.das.proximo) {
    obs.push(`Proximo DAS: ${MESES_PT[d.das.proximo.month - 1]} ${d.das.proximo.year} - ${brl(d.das.proximo.value)} vence ${fmtDataLonga(d.das.proximo.dueDate)}.`);
  }

  if (d.totals.lucroLiquido > 0) {
    const margem = d.totals.receita > 0 ? Math.round((d.totals.lucroLiquido / d.totals.receita) * 100) : 0;
    obs.push(`Margem de lucro do mes: ${margem}% (${brl(d.totals.lucroLiquido)} sobre ${brl(d.totals.receita)}).`);
  } else if (d.totals.lucroLiquido < 0) {
    obs.push('ATENCAO: Lucro liquido negativo no mes. Despesas superaram receitas.');
  }

  if (d.totals.retirada > 0) {
    obs.push(`Retiradas do socio: ${brl(d.totals.retirada)}.`);
  }

  obs.forEach((o, i) => {
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(`${i + 1}. ${o}`, w - 40);
    lines.forEach((line: string) => {
      if (y > h - 30) { doc.addPage(); y = pageHeader(doc, 'OBSERVACOES (cont.)', d, w); }
      doc.text(line, 20, y);
      y += 6;
    });
    y += 2;
  });

  // Rodape de cada pagina com numero
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COR_CINZA);
    doc.text(
      `Pagina ${i} de ${totalPages}  ·  ${d.user.name ?? 'Cliente'}  ·  ${MESES_PT[d.period.month - 1]}/${d.period.year}`,
      w / 2,
      h - 8,
      { align: 'center' },
    );
  }

  return doc;
}

/**
 * Cabecalho compacto de paginas internas.
 */
function pageHeader(doc: jsPDF, titulo: string, d: RelatorioData, w: number): number {
  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, w, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, 20, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const periodo = `${MESES_PT[d.period.month - 1]} ${d.period.year}`;
  doc.text(periodo, w - 20, 14, { align: 'right' });

  return 32;
}

/**
 * Helper pra baixar o PDF no navegador.
 */
export function baixarPDF(doc: jsPDF, fileName: string) {
  doc.save(fileName);
}

/**
 * Helper pra abrir num share dialog (Web Share API se disponivel).
 */
export async function compartilharPDF(doc: jsPDF, fileName: string, title?: string): Promise<boolean> {
  try {
    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
      await (navigator as any).share({
        files: [file],
        title: title ?? fileName,
        text: 'Relatorio mensal gerado pelo app Grana',
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Erro ao compartilhar:', e);
    return false;
  }
}
