import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { stripe, STRIPE_PRICE_PRO_MONTHLY, getAppUrl } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * Cria a sessao de checkout no Stripe e devolve a URL de redirect.
 *
 * Fluxo:
 * 1. Pega o user logado pelo cookie de sessao.
 * 2. Garante um Customer no Stripe (cria na primeira vez, reusa depois).
 * 3. Abre uma Checkout Session em modo "subscription".
 * 4. Devolve { url } pra o cliente redirecionar.
 *
 * Sucesso e cancelamento voltam pra paginas dedicadas em /app/upgrade/.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieName = getUserCookieName();
    const uid = req.cookies.get(cookieName)?.value;
    if (!uid) {
      return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });
    }

    if (!STRIPE_PRICE_PRO_MONTHLY) {
      return NextResponse.json(
        { error: 'STRIPE_PRICE_PRO_MONTHLY nao configurado' },
        { status: 500 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    // Reusa Customer se ja existir, senao cria. Vincula nosso uid no metadata
    // pra simplificar o webhook.
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: STRIPE_PRICE_PRO_MONTHLY, quantity: 1 }],
      // Pra recurring em BRL precisa Pix? Nao — Stripe BR + cartao basta.
      // Permite cartao salvado no Customer aparecer pre-selecionado.
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      success_url: `${appUrl}/app/upgrade/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app/upgrade/cancelado`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe nao retornou URL de checkout' },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('[stripe checkout] erro:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Falha ao abrir checkout' },
      { status: 500 },
    );
  }
}
