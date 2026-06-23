/**
 * Sentry — client side. So inicializa se DSN estiver setado, pra nao
 * vazar erros de ambiente local nem rodar em build sem credencial.
 *
 * tracesSampleRate baixo (10%) pra economizar quota free tier.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    // Filtra erros conhecidos que nao queremos ruido (extensoes de browser etc)
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
  });
}
