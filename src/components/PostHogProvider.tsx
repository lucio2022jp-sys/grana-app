'use client';

/**
 * Provider do PostHog. Roda apenas no client, so inicializa se a chave
 * publica estiver setada (evita rodar em build/local sem env).
 *
 * Eventos importantes que disparamos manualmente em outros pontos:
 *   - signup, login
 *   - first_transaction
 *   - view_das, view_dasn, view_perfil
 *   - click_upgrade, upgrade_completed
 *   - lead_captured, whatsapp_click
 */
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as Provider } from 'posthog-js/react';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && KEY && !posthog.__loaded) {
  posthog.init(KEY, {
    api_host: HOST,
    // Captura pageview manualmente pra ter controle sobre rotas Next
    capture_pageview: false,
    person_profiles: 'identified_only',
  });
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !KEY) return;
    let url = window.origin + pathname;
    if (searchParams && searchParams.toString()) {
      url = url + '?' + searchParams.toString();
    }
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!KEY) return <>{children}</>;
  return (
    <Provider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </Provider>
  );
}
