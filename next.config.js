// Sentry envolve o config so se DSN estiver setado, pra builds locais
// nao precisarem de credencial. Em prod o DSN vem do .env da Vercel.
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
};

const sentryEnabled = !!(
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
);

module.exports = sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
