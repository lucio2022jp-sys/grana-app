/**
 * Auth simples pro painel /admin.
 *
 * Compara senha digitada com ADMIN_PASSWORD do .env e seta cookie
 * httpOnly que dura 7 dias. Sem bcrypt, sem usuario, sem nada.
 *
 * Quando voce tiver muitos usuarios, troca por NextAuth + Google.
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'grana_admin';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

/**
 * Gera token assinado com a propria senha (HMAC).
 * Quem nao tem ADMIN_PASSWORD nao consegue forjar.
 */
function gerarToken(): string {
  const senha = process.env.ADMIN_PASSWORD ?? '';
  if (!senha) return '';
  const issuedAt = Date.now().toString();
  const sig = crypto
    .createHmac('sha256', senha)
    .update(issuedAt)
    .digest('hex');
  return `${issuedAt}.${sig}`;
}

function validarToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const senha = process.env.ADMIN_PASSWORD ?? '';
  if (!senha) return false;

  const [issuedAt, sig] = token.split('.');
  if (!issuedAt || !sig) return false;

  const ts = parseInt(issuedAt, 10);
  if (!isFinite(ts)) return false;

  // Expirou?
  if (Date.now() - ts > COOKIE_MAX_AGE * 1000) return false;

  const expectedSig = crypto
    .createHmac('sha256', senha)
    .update(issuedAt)
    .digest('hex');

  // Comparacao constant-time pra evitar timing attack
  if (sig.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
}

export function checkAdminPassword(password: string): boolean {
  const senha = process.env.ADMIN_PASSWORD ?? '';
  if (!senha) return false;
  if (password.length !== senha.length) return false;
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(senha));
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function adminTokenForLogin(): string {
  return gerarToken();
}

/**
 * Server-side: confere se o request tem cookie admin valido.
 */
export function isAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return validarToken(token);
}

/**
 * Pra usar em pages async (server components).
 */
export function isAdminServerComponent(): boolean {
  const token = cookies().get(COOKIE_NAME)?.value;
  return validarToken(token);
}
