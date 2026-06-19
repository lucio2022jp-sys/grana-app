import { NextResponse } from 'next/server';
import { getCookieOptions, getUserCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Rota /demo: seta o cookie do user demo (Bruna) e manda direto pro /app.
 * Serve pra apresentacao publica sem precisar criar conta.
 *
 * Implementado como Route Handler (e nao page.tsx) porque o Next 14
 * so permite escrever cookies em Route Handler ou Server Action.
 */
export async function GET(request: Request) {
  const demoId = process.env.DEMO_USER_ID;
  const url = new URL(request.url);
  const target = demoId ? '/app' : '/login';
  const response = NextResponse.redirect(new URL(target, url));

  if (demoId) {
    response.cookies.set({
      name: getUserCookieName(),
      value: demoId,
      ...getCookieOptions(),
    });
  }

  return response;
}
