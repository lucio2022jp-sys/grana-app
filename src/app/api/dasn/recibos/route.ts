/**
 * Historico de DASN-SIMEI entregue.
 *
 * GET  /api/dasn/recibos        -> lista todos os anos entregues
 * POST /api/dasn/recibos        -> registra entrega (multipart/form-data)
 *   campos: year, valorDeclarado, receitaComercio, receitaServicos,
 *           deliveredAt (opcional, default agora), pdf (opcional File)
 *
 * O PDF e opcional pra nao bloquear o registro caso o user prefira so
 * marcar como entregue. Se subir, vai pro Supabase Storage no path
 * dasn/{userId}/{year}-{ts}.pdf.
 *
 * Constraint @@unique([userId, year]) garante 1 registro por ano-base.
 * Re-entrega (raro) faz upsert: atualiza o registro existente.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import {
  uploadDasnRecibo,
  isStorageConfigured,
  ALLOWED_RECEIPT_MIMES,
  MAX_RECEIPT_BYTES,
  getDasnSignedUrl,
  deleteDasn,
} from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const recibos = await prisma.dasnRecibo.findMany({
    where: { userId: uid },
    orderBy: { year: 'desc' },
  });

  // Gera URL assinada para cada PDF que tem path. Se storage nao tiver
  // configurado, signedUrl fica null e UI mostra "PDF indisponivel".
  const out = await Promise.all(
    recibos.map(async (r) => ({
      ...r,
      signedUrl: r.pdfPath ? await getDasnSignedUrl(r.pdfPath) : null,
    })),
  );

  return NextResponse.json({ recibos: out });
}

export async function POST(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Esperando multipart/form-data' }, { status: 400 });
  }

  const year = Number(form.get('year'));
  const valorDeclarado = Number(form.get('valorDeclarado'));
  const receitaComercio = Number(form.get('receitaComercio') ?? 0);
  const receitaServicos = Number(form.get('receitaServicos') ?? 0);
  const deliveredAtStr = form.get('deliveredAt');
  const deliveredAt = deliveredAtStr ? new Date(String(deliveredAtStr)) : new Date();

  if (!year || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'Ano invalido' }, { status: 400 });
  }
  if (!Number.isFinite(valorDeclarado) || valorDeclarado < 0) {
    return NextResponse.json({ error: 'Valor declarado invalido' }, { status: 400 });
  }

  // Upload do PDF (opcional)
  let pdfPath: string | null = null;
  const pdfFile = form.get('pdf') as File | null;
  if (pdfFile && pdfFile.size > 0) {
    if (!isStorageConfigured()) {
      // Permite registrar sem PDF se storage nao configurado.
      // UI deveria avisar antes, mas defendemos no server tambem.
      return NextResponse.json(
        { error: 'Storage nao configurado. Marque sem anexar PDF, ou configure SUPABASE_URL.' },
        { status: 503 },
      );
    }
    if (pdfFile.size > MAX_RECEIPT_BYTES) {
      return NextResponse.json({ error: 'PDF muito grande (max 8MB)' }, { status: 413 });
    }
    const mime = pdfFile.type || 'application/pdf';
    if (!ALLOWED_RECEIPT_MIMES.includes(mime as any)) {
      return NextResponse.json({ error: 'Formato nao aceito (use PDF ou imagem)' }, { status: 415 });
    }

    const buf = Buffer.from(await pdfFile.arrayBuffer());

    // Se ja existe recibo desse ano com PDF, deleta o antigo antes de subir
    const existing = await prisma.dasnRecibo.findUnique({
      where: { userId_year: { userId: uid, year } },
    });
    if (existing?.pdfPath) {
      try {
        await deleteDasn(existing.pdfPath);
      } catch {
        // segue baile, novo upload sobrescreve
      }
    }

    try {
      const up = await uploadDasnRecibo({ userId: uid, year, buffer: buf, mime });
      pdfPath = up.path;
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'erro upload' }, { status: 500 });
    }
  }

  const recibo = await prisma.dasnRecibo.upsert({
    where: { userId_year: { userId: uid, year } },
    create: {
      userId: uid,
      year,
      deliveredAt,
      valorDeclarado,
      receitaComercio,
      receitaServicos,
      pdfPath,
    },
    update: {
      deliveredAt,
      valorDeclarado,
      receitaComercio,
      receitaServicos,
      ...(pdfPath ? { pdfPath } : {}), // so atualiza se subiu PDF novo
    },
  });

  return NextResponse.json({ recibo });
}

export async function DELETE(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const url = new URL(req.url);
  const year = Number(url.searchParams.get('year'));
  if (!year) return NextResponse.json({ error: 'year obrigatorio' }, { status: 400 });

  const existing = await prisma.dasnRecibo.findUnique({
    where: { userId_year: { userId: uid, year } },
  });
  if (!existing) return NextResponse.json({ ok: true });

  if (existing.pdfPath) {
    try {
      await deleteDasn(existing.pdfPath);
    } catch {}
  }

  await prisma.dasnRecibo.delete({
    where: { userId_year: { userId: uid, year } },
  });

  return NextResponse.json({ ok: true });
}
