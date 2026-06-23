import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { reportarConversaoIndicacao } from '@/lib/referral';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';
// Webhook precisa do body raw pra validar a assinatura. Next 14 entrega
// o body como Request padrao; usamos req.text() pra evitar parsing.
export const runtime = 'nodejs';

/**
 * Webhook do Stripe. Atualiza o estado do plano da User com base nos eventos
 * de assinatura.
 *
 * Eventos tratados:
 * - checkout.session.completed: usuaria pagou, marca plano como pro.
 * - customer.subscription.created/updated: status mudou (trial, active,
 *   past_due, canceled). Atualiza planUntil = current_period_end.
 * - customer.subscription.deleted: cancelamento total, volta pra free.
 * - invoice.paid: renovou. Empurra planUntil pra frente.
 * - invoice.payment_failed: log apenas (Stripe ja tenta recuperar).
 *
 * Configurar URL no painel do Stripe:
 *   https://<dominio>/api/stripe/webhook
 *
 * Variavel necessaria: STRIPE_WEBHOOK_SECRET (whsec_...)
 */

/**
 * SDK 22.x mudou `current_period_end` do top-level pra dentro do item da
 * Subscription. Pegamos o maior `current_period_end` dos items pra cobrir
 * casos teoricos de multiplos items.
 */
function getPeriodEnd(sub: Stripe.Subscription): Date | null {
  const topLevel = (sub as any).current_period_end as number | undefined;
  if (typeof topLevel === 'number' && topLevel > 0) {
    return new Date(topLevel * 1000);
  }
  const items = sub.items?.data ?? [];
  let max = 0;
  for (const it of items) {
    const cpe = (it as any).current_period_end as number | undefined;
    if (typeof cpe === 'number' && cpe > max) max = cpe;
  }
  return max > 0 ? new Date(max * 1000) : null;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      { error: 'webhook nao configurado' },
      { status: 400 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error('[stripe webhook] assinatura invalida:', err?.message);
    return NextResponse.json(
      { error: `signature invalida: ${err?.message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        // Sub criada pelo checkout — pega ela pra capturar period_end.
        let planUntil: Date | null = null;
        let subscriptionId: string | null = null;
        if (session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          subscriptionId = subId;
          const sub = await stripe.subscriptions.retrieve(subId);
          planUntil = getPeriodEnd(sub);
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: 'pro',
            planUntil,
            stripeSubscriptionId: subscriptionId ?? undefined,
            stripeCustomerId:
              (typeof session.customer === 'string'
                ? session.customer
                : session.customer?.id) ?? undefined,
          },
        });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        const ativo = ['active', 'trialing'].includes(sub.status);
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: ativo ? 'pro' : 'free',
            planUntil: getPeriodEnd(sub),
            stripeSubscriptionId: sub.id,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: 'free',
            planUntil: null,
            stripeSubscriptionId: null,
          },
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const rawSub = (invoice as any).subscription as
          | string
          | { id: string }
          | undefined;
        const subId = typeof rawSub === 'string' ? rawSub : rawSub?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: 'pro',
            planUntil: getPeriodEnd(sub),
          },
        });

        // Recompensa de indicacao: idempotente via referralRewardedAt.
        // invoice.paid eh o sinal certo (renovacoes nao premiam de novo).
        try {
          await reportarConversaoIndicacao(userId);
        } catch (err: any) {
          console.error('[stripe webhook] referral falhou:', err?.message);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          '[stripe webhook] invoice.payment_failed',
          invoice.id,
          invoice.customer,
        );
        // Stripe automaticamente vai tentar de novo. Quando esgotar tentativas
        // ele dispara customer.subscription.deleted ou status=past_due.
        break;
      }

      default:
        // Sem-op pra eventos nao tratados, mantem o webhook idempotente.
        break;
    }
  } catch (err: any) {
    console.error('[stripe webhook] erro processando', event.type, err);
    return NextResponse.json(
      { error: err?.message ?? 'erro processando evento' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
