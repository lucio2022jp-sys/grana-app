import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCookieOptions, getUserCookieName } from '@/lib/session';
import { normalizeEmail, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().trim().email('E-mail invalido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const email = normalizeEmail(data.email);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      // Mensagem generica pra nao revelar se o e-mail existe.
      return NextResponse.json(
        { error: 'credenciais', message: 'E-mail ou senha incorretos.' },
        { status: 401 },
      );
    }

    const ok = verifyPassword(data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: 'credenciais', message: 'E-mail ou senha incorretos.' },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
    response.cookies.set(getUserCookieName(), user.id, getCookieOptions());
    return response;
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: 'invalido', message: e.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
    }
    console.error('[POST /api/auth/login] erro:', e?.message);
    return NextResponse.json({ error: 'erro', message: e?.message ?? 'Erro ao entrar.' }, { status: 500 });
  }
}
