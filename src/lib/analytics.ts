/**
 * Wrapper fino pra disparar eventos de analytics. Centraliza nomes
 * de eventos pra evitar typo e facilitar refactor.
 *
 * Uso (client component):
 *   import { track } from '@/lib/analytics';
 *   track('click_upgrade', { plan: 'founder' });
 */

type EventName =
  | 'signup'
  | 'login'
  | 'first_transaction'
  | 'view_das'
  | 'view_dasn'
  | 'view_perfil'
  | 'click_upgrade'
  | 'upgrade_completed'
  | 'lead_captured'
  | 'whatsapp_click'
  | 'lancamento_criado'
  | 'extrato_importado';

export function track(event: EventName, props?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  const ph = (window as any).posthog;
  if (!ph?.capture) return;
  try {
    ph.capture(event, props ?? {});
  } catch (e) {
    // analytics nao pode quebrar o app
    console.warn('[analytics] falha:', e);
  }
}

export function identify(userId: string, props?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  const ph = (window as any).posthog;
  if (!ph?.identify) return;
  try {
    ph.identify(userId, props ?? {});
  } catch (e) {
    console.warn('[analytics] identify falhou:', e);
  }
}

export function reset() {
  if (typeof window === 'undefined') return;
  const ph = (window as any).posthog;
  if (!ph?.reset) return;
  try {
    ph.reset();
  } catch {}
}
