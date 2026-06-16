/**
 * Sessao simples baseada em cookie.
 * Pra MVP, sem senha. So cria/recupera um user pelo cookie "uid".
 * Em producao trocar pra NextAuth ou Supabase Auth.
 */

import { cookies } from 'next/headers';
import { prisma } from './db';

const COOKIE_NAME = 'grana_uid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10; // 10 anos (efetivamente permanente)

export async function getOrCreateUser() {
  const store = cookies();
  let uid = store.get(COOKIE_NAME)?.value;

  let user = uid
    ? await prisma.user.findUnique({ where: { id: uid } })
    : null;

  if (!user) {
    user = await prisma.user.create({ data: {} });
    // Cookie sera setado via response header em route handlers
  }

  return user;
}

export function getUserCookieName() {
  return COOKIE_NAME;
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  };
}
