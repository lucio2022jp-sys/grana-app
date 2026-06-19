import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';
import {
  ALLOWED_RECEIPT_MIMES,
  MAX_RECEIPT_BYTES,
  deleteReceipt,
  getReceiptSignedUrl,
  isStorageConfigured,
  uploadReceipt,
} from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Upload de comprovante: limita pra evitar abuso (cada upload custa banda + storage).
const ATTACHMENT_LIMIT = 30;
const ATTACHMENT_WINDOW_MS = 60 * 60 * 1000; // 1 hora

async function authenticate(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return null;
  return uid;
}

async function loadOwnedTx(uid: string, txId: string) {
  const tx = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!tx || tx.userId !== uid) return null;
  return tx;
}

// GET: retorna URL assinada (TTL curto) pra usuaria visualizar o comprovante.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = await authenticate(req);
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const tx = await loadOwnedTx(uid, params.id);
  if (!tx) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });

  if (!tx.attachmentUrl) {
    return NextResponse.json({ url: null });
  }

  const url = await getReceiptSignedUrl(tx.attachmentUrl);
  if (!url) {
    return NextResponse.json(
      { error: 'Nao foi possivel gerar link do comprovante.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ url });
}

// POST: recebe o arquivo (multipart/form-data, campo "file"), valida e sobe
// pro Supabase Storage. Substitui o anexo anterior, se houver.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = await authenticate(req);
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const rl = rateLimit(rateLimitKey(req, 'attachment', uid), {
    limit: ATTACHMENT_LIMIT,
    refillMs: ATTACHMENT_WINDOW_MS,
  });
  if (!rl.ok) {
    const retrySec = Math.ceil(rl.retryAfterMs / 1000);
    return NextResponse.json(
      { error: `Muitos uploads. Tente em ${Math.ceil(retrySec / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(retrySec) } },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          'Storage nao configurado. Peca ao admin pra definir SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.',
      },
      { status: 503 },
    );
  }

  const tx = await loadOwnedTx(uid, params.id);
  if (!tx) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Form invalido.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 });
  }

  if (file.size > MAX_RECEIPT_BYTES) {
    const maxMb = Math.round(MAX_RECEIPT_BYTES / 1024 / 1024);
    return NextResponse.json(
      { error: `Arquivo muito grande. Maximo ${maxMb}MB.` },
      { status: 413 },
    );
  }

  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_RECEIPT_MIMES.includes(mime as (typeof ALLOWED_RECEIPT_MIMES)[number])) {
    return NextResponse.json(
      { error: 'Formato nao suportado. Use foto (JPG/PNG/WEBP/HEIC) ou PDF.' },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const previousPath = tx.attachmentUrl;

  let path: string;
  try {
    const result = await uploadReceipt({
      userId: uid,
      transactionId: tx.id,
      buffer,
      mime,
    });
    path = result.path;
  } catch (err) {
    console.error('Falha no upload de comprovante:', err);
    return NextResponse.json(
      { error: 'Falha ao enviar comprovante. Tente de novo.' },
      { status: 500 },
    );
  }

  await prisma.transaction.update({
    where: { id: tx.id },
    data: { attachmentUrl: path },
  });

  // Limpa anexo antigo depois de gravar o novo (best-effort).
  if (previousPath && previousPath !== path) {
    await deleteReceipt(previousPath);
  }

  const signed = await getReceiptSignedUrl(path);
  return NextResponse.json({ ok: true, path, url: signed });
}

// DELETE: remove o comprovante anexado (storage + coluna).
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = await authenticate(req);
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const tx = await loadOwnedTx(uid, params.id);
  if (!tx) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });

  if (tx.attachmentUrl) {
    await deleteReceipt(tx.attachmentUrl);
  }

  await prisma.transaction.update({
    where: { id: tx.id },
    data: { attachmentUrl: null },
  });

  return NextResponse.json({ ok: true });
}
