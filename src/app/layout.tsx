import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import PWARegister from '@/components/PWARegister';

/**
 * URL canonica do app. Usa env quando configurada (apontar pra dominio
 * proprio em prod), cai pro vercel.app como fallback.
 */
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://grana-app-sigma.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Grana — Sua empresa no caminho certo',
    template: '%s | Grana',
  },
  description:
    'Controle financeiro pra autônomas e MEIs, sem planilha e sem dor de cabeça. Importa extrato, categoriza com IA, calcula DAS e mostra quanto sobra de verdade.',
  applicationName: 'Grana',
  keywords: [
    'controle financeiro',
    'finanças autônomo',
    'MEI',
    'DAS MEI',
    'Simples Nacional',
    'app finanças',
    'planilha autônomo',
    'gestão financeira pequena empresa',
  ],
  authors: [{ name: 'Grana' }],
  creator: 'Grana',
  publisher: 'Grana',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: APP_URL,
    siteName: 'Grana',
    title: 'Grana — Sua empresa no caminho certo',
    description:
      'Controle financeiro pra autônomas e MEIs, sem planilha e sem dor de cabeça. Importa extrato, categoriza com IA e mostra quanto sobra de verdade.',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Grana',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grana — Sua empresa no caminho certo',
    description:
      'Controle financeiro pra autônomas e MEIs, sem planilha e sem dor de cabeça.',
    images: ['/icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Grana',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans">
        <div className="mx-auto max-w-md min-h-screen flex flex-col relative overflow-hidden">
          {children}
        </div>
        <PWARegister />
        {/* Analytics e Speed Insights da Vercel — gratis, ja embutidos no plano */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
