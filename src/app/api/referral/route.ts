import { NextRequest, NextResponse } from 'next/server';
import { getUserCookieName } from '@/lib/session';
import { getResumoIndicacoes } from '@/lib/referral';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referral
 * Retorna code, link, contadores e ultimas indicacoes pra pagina /app/indique.
 * Cria o codigo lazy se ainda nao existe.
 */
export async function GET(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const resumo = await getResumoIndicacoes(uid);
    return NextResponse.json(resumo);
  } catch (e: any) {
    console.error('[GET /api/referral] erro:', e?.message);
    return NextResponse.json({ error: 'erro' }, { status: 500 });
  }
}
