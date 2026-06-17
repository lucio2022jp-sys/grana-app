/**
 * Utilidades de token pra recuperacao de senha.
 *
 * - Token cru: 32 bytes random em base64url (~43 chars, URL-safe).
 *   Vai no link do e-mail e no body do POST de reset. Nunca persiste.
 * - Token armazenado no banco: SHA-256 do token cru, hex.
 *   Se o banco vazar, ninguem consegue usar os tokens nem prever os proximos.
 * - TTL: 30 minutos.
 */

import { createHash, randomBytes } from 'node:crypto';

export const TOKEN_TTL_MS = 30 * 60 * 1000;

export function generateRawToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function buildResetUrl(rawToken: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/reset/${rawToken}`;
}

export function tokenExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_MS);
}
