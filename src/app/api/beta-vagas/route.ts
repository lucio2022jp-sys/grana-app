/**
 * Endpoint publico que retorna quantas vagas Beta ainda existem.
 *
 * Cap definido em BETA_CAP. Conta usuarios com qualquer assinatura
 * ativa (status active/trialing) + numero de signups confirmados.
 * Pra simplificar e dar a sensacao certa pro visitante, contamos
 * usuarios totais cadastrados (cada User = 1 vaga ocupada).
 *
 * GET /api/beta-vagas
 * Cache 60s pra nao bater no DB toda requisicao.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const BETA_CAP = Number(process.env.BETA_VAGAS_CAP ?? 100);

let cache: { restantes: number; total: number; cap: number; ts: number } | null =
  null;
const TTL_MS = 60_000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < TTL_MS) {
    return NextResponse.json({
      restantes: cache.restantes,
      total: cache.total,
      cap: cache.cap,
    });
  }

  try {
    const total = await prisma.user.count();
    const restantes = Math.max(0, BETA_CAP - total);
    cache = { restantes, total, cap: BETA_CAP, ts: now };
    return NextResponse.json({ restantes, total, cap: BETA_CAP });
  } catch (e) {
    // Em caso de falha de DB devolvemos um valor seguro pra nao quebrar
    // o banner (mostra "vagas limitadas" generico)
    return NextResponse.json({
      restantes: null,
      total: null,
      cap: BETA_CAP,
    });
  }
}
