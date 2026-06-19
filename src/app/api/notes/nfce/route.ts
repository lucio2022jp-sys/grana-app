/**
 * Recebe o conteudo bruto de um QR Code escaneado pelo cliente, faz fetch da
 * pagina publica da SEFAZ e devolve os campos da NFC-e ja extraidos.
 *
 * Eh um GET-disfarcado-de-POST por uma razao boba: o conteudo de QR pode ter
 * ate 500 chars com pipes/queries que nao se dao bem em querystring. POST
 * tambem evita cache de proxy.
 *
 * Auth: usa o cookie de sessao normal. Se nao tiver, retorna 401.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAndParseNfce } from '@/lib/nfce';
import { getUserCookieName } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { qr?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'json invalido' }, { status: 400 });
  }
  const qr = (body.qr || '').trim();
  if (!qr) return NextResponse.json({ error: 'qr vazio' }, { status: 400 });
  if (qr.length > 1000) return NextResponse.json({ error: 'qr muito longo' }, { status: 400 });

  const parsed = await fetchAndParseNfce(qr);
  if (!parsed) {
    return NextResponse.json({ error: 'qr nao reconhecido como NFC-e' }, { status: 422 });
  }

  return NextResponse.json({ nfce: parsed });
}
