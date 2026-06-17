import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware: protege rotas privadas.
 *
 * - Rotas publicas: /, /login, /signup, /demo, /onboarding/*, /admin/*, /api/*, /_next, etc.
 * - Rotas privadas: /app/*  -> precisa de cookie grana_uid; senao redireciona pra /login.
 *
 * O cookie da Bruna so e setado pela rota /demo (server-side), entao um visitante
 * comum NAO ve mais os dados dela automaticamente.
 *
 * Roda no edge runtime — nao usa Prisma, so cookie/url.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protege apenas /app/* (todas as telas privadas vivem dentro de /app)
  if (pathname.startsWith('/app')) {
    const uid = req.cookies.get('grana_uid')?.value;
    if (!uid) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$).*)'],
};
