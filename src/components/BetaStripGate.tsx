'use client';

/**
 * Wrapper do BetaVagasBanner que decide se renderiza baseado em:
 *  1. Path atual — esconde em /app, /admin, /onboarding
 *  2. Prop `logado` — recebida do server layout (cookie grana_uid eh
 *     httpOnly entao nao da pra ler do client)
 */
import { usePathname } from 'next/navigation';
import BetaVagasBanner from './BetaVagasBanner';

const ROTAS_PRIVADAS = ['/app', '/admin', '/onboarding'];

export default function BetaStripGate({ logado }: { logado: boolean }) {
  const pathname = usePathname();

  if (logado) return null;

  const emRotaPrivada = ROTAS_PRIVADAS.some((r) => pathname?.startsWith(r));
  if (emRotaPrivada) return null;

  return <BetaVagasBanner variant="strip" />;
}
