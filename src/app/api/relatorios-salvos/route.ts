/**
 * Relatorios mensais salvos.
 *
 * GET  /api/relatorios-salvos        -> lista todos do user com signed URLs
 * POST /api/relatorios-salvos        -> gera/regenera o relatorio do mes
 *   body: { year, month }            (sob demanda da usuaria)
 *
 * Salva o PDF no Storage e o snapshot dos numeros no banco. Se ja existe
 * o registro pra esse mes, regenera e atualiza (upsert).
 *
 * Tolera storage nao configurado: salva o snapshot sem o PDF e a UI mostra
 * que o arquivo nao esta disponivel.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import {
  isStorageConfigured,
  uploadRelatorio,
  getRelatorioSignedUrl,
  deleteRelatorio,
} from '@/lib/storage';
import { gerarRelatorioBuffer } from '@/lib/relatorio-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const relatorios = await prisma.relatorioMensal.findMany({
    where: { userId: uid },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const out = await Promise.all(
    relatorios.map(async (r) => ({
      ...r,
      signedUrl: r.pdfPath ? await getRelatorioSignedUrl(r.pdfPath) : null,
    })),
  );

  return NextResponse.json({ relatorios: out, storageConfigured: isStorageConfigured() });
}

export async function POST(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  let body: { year?: number; month?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
  }

  const year = Number(body.year);
  const month = Number(body.month);
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: 'year/month invalidos' }, { status: 400 });
  }

  // Gera o buffer e os totais
  let buffer: Buffer;
  let totais;
  try {
    const result = await gerarRelatorioBuffer(uid, year, month);
    buffer = result.buffer;
    totais = result.totais;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'erro ao gerar' }, { status: 500 });
  }

  // Tenta upload se storage configurado
  let pdfPath: string | null = null;
  if (isStorageConfigured()) {
    // Apaga o anterior pra nao acumular arquivos antigos
    const existing = await prisma.relatorioMensal.findUnique({
      where: { userId_year_month: { userId: uid, year, month } },
    });
    if (existing?.pdfPath) {
      try { await deleteRelatorio(existing.pdfPath); } catch {}
    }

    try {
      const up = await uploadRelatorio({ userId: uid, year, month, buffer });
      pdfPath = up.path;
    } catch (e: any) {
      // Storage falhou — segue salvando o snapshot, sem PDF
      console.warn('Falha no upload do relatorio, salvando snapshot sem PDF:', e?.message);
    }
  }

  const relatorio = await prisma.relatorioMensal.upsert({
    where: { userId_year_month: { userId: uid, year, month } },
    create: {
      userId: uid,
      year,
      month,
      receita: totais.receita,
      despesas: totais.despesas,
      lucro: totais.lucro,
      txCount: totais.txCount,
      pdfPath,
      geradoAuto: false,
      geradoEm: new Date(),
    },
    update: {
      receita: totais.receita,
      despesas: totais.despesas,
      lucro: totais.lucro,
      txCount: totais.txCount,
      ...(pdfPath ? { pdfPath } : {}),
      geradoAuto: false,
      geradoEm: new Date(),
    },
  });

  return NextResponse.json({
    relatorio: {
      ...relatorio,
      signedUrl: relatorio.pdfPath ? await getRelatorioSignedUrl(relatorio.pdfPath) : null,
    },
  });
}
