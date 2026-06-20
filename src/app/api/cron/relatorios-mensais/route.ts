/**
 * Cron mensal: gera o relatorio do mes anterior pra cada user que teve
 * receita. Rodada todo dia 5 (no inicio do novo mes).
 *
 * Por que dia 5: dar uma folga pro extrato bancario fechar o mes anterior.
 * Se o user importou ate o dia 4, ja temos os numeros completos. Se importar
 * depois, ele pode regenerar manualmente em /app/relatorios.
 *
 * Config no vercel.json: schedule "0 9 5 * *" (todo dia 5 as 09:00 UTC).
 *
 * Protecao via CRON_SECRET, igual ao cron de lembretes.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { gerarRelatorioBuffer } from '@/lib/relatorio-server';
import {
  isStorageConfigured,
  uploadRelatorio,
  deleteRelatorio,
} from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // pode levar tempo pra varios users

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const header = req.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

async function run() {
  // Mes anterior
  const now = new Date();
  const refDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = refDate.getFullYear();
  const month = refDate.getMonth() + 1;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  // Pega users que tiveram receita no mes
  const usersComReceita = await prisma.transaction.groupBy({
    by: ['userId'],
    where: {
      type: 'receita',
      date: { gte: monthStart, lt: monthEnd },
    },
    _count: true,
  });

  const results: Array<{
    userId: string;
    ok: boolean;
    error?: string;
    pdfSaved?: boolean;
  }> = [];

  for (const u of usersComReceita) {
    try {
      const { buffer, totais } = await gerarRelatorioBuffer(u.userId, year, month);

      let pdfPath: string | null = null;
      if (isStorageConfigured()) {
        // Apaga anterior
        const existing = await prisma.relatorioMensal.findUnique({
          where: { userId_year_month: { userId: u.userId, year, month } },
        });
        if (existing?.pdfPath) {
          try { await deleteRelatorio(existing.pdfPath); } catch {}
        }

        try {
          const up = await uploadRelatorio({ userId: u.userId, year, month, buffer });
          pdfPath = up.path;
        } catch (e) {
          // segue salvando snapshot sem PDF
        }
      }

      await prisma.relatorioMensal.upsert({
        where: { userId_year_month: { userId: u.userId, year, month } },
        create: {
          userId: u.userId,
          year,
          month,
          receita: totais.receita,
          despesas: totais.despesas,
          lucro: totais.lucro,
          txCount: totais.txCount,
          pdfPath,
          geradoAuto: true,
          geradoEm: new Date(),
        },
        update: {
          receita: totais.receita,
          despesas: totais.despesas,
          lucro: totais.lucro,
          txCount: totais.txCount,
          ...(pdfPath ? { pdfPath } : {}),
          geradoAuto: true,
          geradoEm: new Date(),
        },
      });

      results.push({ userId: u.userId, ok: true, pdfSaved: !!pdfPath });
    } catch (e: any) {
      results.push({ userId: u.userId, ok: false, error: e?.message ?? 'erro' });
    }
  }

  return {
    period: { year, month },
    usuariosProcessados: results.length,
    sucessos: results.filter((r) => r.ok).length,
    falhas: results.filter((r) => !r.ok).length,
    pdfsSalvos: results.filter((r) => r.pdfSaved).length,
  };
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Sem autorizacao' }, { status: 401 });
  }
  try {
    const summary = await run();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'erro' },
      { status: 500 },
    );
  }
}

// Permite POST tb pra teste manual
export const POST = GET;
