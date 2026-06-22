import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { stripe, getAppUrl } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * Abre o Customer Portal do Stripe. Cliente gerencia cartao, baixa fatura,
 * cancela assinatura por la — Stripe assume toda essa parte.
 *
 * Pre-requisito: ativar o portal no painel do Stripe.
 * Settings → Billing → Customer portal → Activate.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieName = getUserCookieName();
    const uid = req.cookies.get(cookieName)?.value;
    if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Cliente Stripe nao encontrado. Faca o upgrade primeiro.' },
        { status: 400 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getAppUrl()}/app/perfil`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('[stripe portal] erro:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Falha ao abrir portal' },
      { status: 500 },
    );
  }
}
