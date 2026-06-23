import type { MetadataRoute } from 'next';

/**
 * robots.txt do Grana.
 *
 * - Permite indexar paginas publicas (home, login, signup, termos, privacidade).
 * - Bloqueia /app/* (area logada), /api/*, /admin/* (sensiveis e sem valor SEO).
 * - Aponta pra sitemap.xml dinamico.
 *
 * Next 14+ gera /robots.txt automaticamente a partir desse export.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://grana-app-sigma.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/app/',
          '/api/',
          '/admin/',
          '/onboarding/',
          '/reset/',
          '/share/',
          '/relatorio-publico/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
