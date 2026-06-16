/**
 * Rate limit simples in-memory (token bucket por chave).
 *
 * Funciona pra single-instance (Vercel default tambem ok pra trafego baixo
 * em uma unica regiao). Pra escalar horizontalmente, trocar a Map por
 * Redis/Upstash mantendo a mesma API.
 *
 * NextRequest -> chave preferencial: cookie de user; fallback: IP do header.
 */

import type { NextRequest } from 'next/server';

type Bucket = { tokens: number; updatedAt: number };

const BUCKETS = new Map<string, Bucket>();

// Limpeza preguicosa quando a Map cresce.
const MAX_KEYS = 5000;

function gc(now: number, refillMs: number) {
  if (BUCKETS.size < MAX_KEYS) return;
  for (const [key, b] of BUCKETS) {
    if (now - b.updatedAt > refillMs * 4) BUCKETS.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
  limit: number;
};

/**
 * Token bucket: `limit` tokens, recarregam totalmente a cada `refillMs`.
 * Cada chamada consome 1 token. Se nao tem token, retorna ok=false e
 * `retryAfterMs` ate o proximo refill total.
 */
export function rateLimit(
  key: string,
  opts: { limit: number; refillMs: number },
): RateLimitResult {
  const { limit, refillMs } = opts;
  const now = Date.now();
  gc(now, refillMs);

  const bucket = BUCKETS.get(key);
  if (!bucket) {
    BUCKETS.set(key, { tokens: limit - 1, updatedAt: now });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0, limit };
  }

  // Recarrega proporcional ao tempo passado (so quando completa o refillMs).
  const elapsed = now - bucket.updatedAt;
  if (elapsed >= refillMs) {
    bucket.tokens = limit;
    bucket.updatedAt = now;
  }

  if (bucket.tokens <= 0) {
    const retryAfterMs = Math.max(1, refillMs - elapsed);
    return { ok: false, remaining: 0, retryAfterMs, limit };
  }

  bucket.tokens -= 1;
  return { ok: true, remaining: bucket.tokens, retryAfterMs: 0, limit };
}

/**
 * Deriva chave estavel pro request: prefere o cookie de user (se existir),
 * cai pra IP. Aceita prefixo pra separar buckets por endpoint.
 */
export function rateLimitKey(req: NextRequest, prefix: string, userId?: string | null): string {
  if (userId) return `${prefix}:u:${userId}`;
  // Vercel/Next costumam preencher um destes
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'anon';
  return `${prefix}:ip:${ip}`;
}

// Exposto pra teste
export function _resetRateLimit() {
  BUCKETS.clear();
}
