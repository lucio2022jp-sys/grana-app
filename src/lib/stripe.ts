import Stripe from 'stripe';

/**
 * Cliente Stripe centralizado. Usa a chave secreta do env.
 * pinned na apiVersion estavel atual; subir aqui qd Stripe lancar nova
 * e a gente revisar tipos.
 */

if (!process.env.STRIPE_SECRET_KEY) {
  // Nao explode no import (build do Next pode rodar sem env), so quando alguem chama
  console.warn('[stripe] STRIPE_SECRET_KEY ausente — checkout vai falhar em runtime');
}

// SDK 22.x usa apiVersion default da prop ressomente do .d.ts. Forçamos
// como any pra nao travar build em uma string que muda toda upgrade.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  // @ts-expect-error - tipagem da apiVersion eh literal e muda a cada release
  apiVersion: '2025-09-30.clover',
  typescript: true,
  appInfo: {
    name: 'Grana App',
    version: '1.0.0',
  },
});

export const STRIPE_PRICE_PRO_MONTHLY =
  process.env.STRIPE_PRICE_PRO_MONTHLY ?? '';

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL?.startsWith('http')
      ? process.env.VERCEL_URL
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
  );
}
