/**
 * Rota curta de indicacao: /r/CODE
 *
 * Atalho pra compartilhar — mais curto e mais facil de digitar que
 * /signup?ref=CODE. Toda visita:
 *   1. Incrementa referralClickCount do dono do codigo (best-effort).
 *   2. Redireciona pra /signup?ref=CODE preservando UTMs.
 *
 * Se o codigo nao existe, redireciona pra /signup limpo (deixamos a
 * pagina de signup decidir como apresentar). Nada de 404 — link
 * compartilhado nao deve dar erro feio.
 *
 * UTMs: se a chamada nao trouxer utm_medium, default = "link"
 * (alguem clicou direto). A pagina /app/indique injeta "share" ou
 * "copy" quando o usuario gera o link via Web Share API ou copia
 * pra clipboard.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await ctx.params;
  const code = (rawCode ?? '').trim().toUpperCase();
  const url = new URL(req.url);

  // Preserva UTMs de quem ja chegou com elas, ou aplica defaults.
  const utmSource = url.searchParams.get('utm_source') ?? 'referral';
  const utmMedium = url.searchParams.get('utm_medium') ?? 'link';
  const utmCampaign = url.searchParams.get('utm_campaign') ?? 'member_get_member';

  // Best-effort: incrementa contador. Se falhar (codigo invalido, db down,
  // qualquer coisa), redireciona mesmo assim — nao bloqueia o fluxo.
  if (code.length === 8) {
    try {
      await prisma.user.update({
        where: { referralCode: code },
        data: { referralClickCount: { increment: 1 } },
      });
    } catch {
      // codigo nao existe ou outra falha — ignora silencioso
    }
  }

  const dest = new URL('/signup', url.origin);
  if (code.length === 8) dest.searchParams.set('ref', code);
  dest.searchParams.set('utm_source', utmSource);
  dest.searchParams.set('utm_medium', utmMedium);
  dest.searchParams.set('utm_campaign', utmCampaign);

  return NextResponse.redirect(dest, { status: 302 });
}
