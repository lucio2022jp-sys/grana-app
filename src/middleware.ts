import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware: garante que todo visitante chegue com um cookie de sessao.
 *
 * Quando DEMO_USER_ID esta setado, qualquer visitante sem cookie ja recebe
 * o id do user demo. Assim o app abre populado (transacoes, DAS, perfil)
 * sem precisar passar pelo onboarding.
 *
 * Em producao "real" deixe DEMO_USER_ID vazio: o middleware vira no-op e
 * cada usuario continua tendo conta propria via /api/me.
 *
 * Roda no edge runtime, entao nao usa Prisma — so manipula cookie.
 */
export function middleware(req: NextRequest) {
  const demoId = process.env.DEMO_USER_ID;
  if (!demoId) return NextResponse.next();

  const existing = req.cookies.get('grana_uid')?.value;
  if (existing) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set('grana_uid', demoId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365 * 10,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

export const config = {
  // Aplica em tudo menos assets estaticos e rotas internas do Next.
  matcher: ['/((?!_next/|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$).*)'],
};
