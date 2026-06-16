import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';

/**
 * Lista historico de imports do usuario (uploads de extrato).
 * Retorna ordenado do mais recente pro mais antigo, ate 100 registros.
 */
export async function GET(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ imports: [], stats: null });

  const uploads = await prisma.upload.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Stats agregadas
  const totalImports = uploads.length;
  const totalTransacoes = uploads.reduce((s, u) => s + u.txCount, 0);
  const ultimoImport = uploads[0]?.createdAt ?? null;

  // Importes do mes atual
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const importesMesCount = uploads.filter((u) => u.createdAt >= inicioMes).length;

  return NextResponse.json({
    imports: uploads.map((u) => ({
      id: u.id,
      fileName: u.fileName,
      fileSize: u.fileSize,
      bankDetected: u.bankDetected,
      // Source extrai do filename (extensao) - se fileName terminar em .ofx/.csv
      // ou usar info do upload. Detectamos pela extensao do arquivo.
      formato: detectFormato(u.fileName),
      status: u.status,
      errorMsg: u.errorMsg,
      txCount: u.txCount,
      createdAt: u.createdAt,
    })),
    stats: {
      totalImports,
      totalTransacoes,
      ultimoImport,
      importesMesCount,
    },
  });
}

function detectFormato(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.ofx') || lower.endsWith('.qfx')) return 'ofx';
  if (lower.endsWith('.csv')) return 'csv';
  return 'pdf';
}
