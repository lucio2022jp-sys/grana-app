import Stripe from 'stripe';

/**
 * Cliente Stripe centralizado. Usa a chave secreta do env.
 *
 * Atencao: instanciacao LAZY. O Next 14 chama "Collecting page data" nas
 * route handlers durante o build, e se a STRIPE_SECRET_KEY nao tiver setada
 * na Vercel, o `new Stripe('')` explode com "Neither apiKey nor
 * config.authenticator provided" e quebra o deploy inteiro. Com lazy, o
 * build passa e o erro aparece so quando alguem realmente chama o checkout
 * em runtime — exatamente o comportamento que queremos.
 */

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY ausente. Configure em Vercel > Settings > Environment Variables.',
    );
  }
  _stripe = new Stripe(key, {
    // @ts-expect-error - tipagem da apiVersion eh literal e muda a cada release
    apiVersion: '2025-09-30.clover',
    typescript: true,
    appInfo: {
      name: 'Grana App',
      version: '1.0.0',
    },
  });
  return _stripe;
}

/**
 * Proxy que delega tudo pra instancia real, instanciada na primeira chamada.
 * Mantem a API antiga (`stripe.checkout.sessions.create(...)`) sem mexer
 * nos call sites.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const real = getStripe();
    const value = Reflect.get(real, prop, real);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export const STRIPE_PRICE_PRO_MONTHLY =
  process.env.STRIPE_PRICE_PRO_MONTHLY ?? '';

export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return vercel.startsWith('http') ? vercel : `https://${vercel}`;
  return 'http://localhost:3000';
}
