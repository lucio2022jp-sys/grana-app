import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { getCookieOptions, getUserCookieName } from '@/lib/session';
import { hashToken } from '@/lib/password-reset';

export const dynamic = 'force-dynamic';

const schema = z.object({
  token: z.string().trim().min(20, 'Token invalido.').max(200),
  password: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres.').max(200),
});

const TOKEN_INVALIDO = {
  error: 'token_invalido',
  message: 'Link expirado ou ja usado. Peca um novo em "Esqueci a senha".',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const tokenHash = hashToken(data.token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    const now = new Date();
    if (!record || record.usedAt || record.expiresAt < now) {
      return NextResponse.json(TOKEN_INVALIDO, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) {
      return NextResponse.json(TOKEN_INVALIDO, { status: 400 });
    }

    const passwordHash = hashPassword(data.password);

    // Atualiza senha + marca este token como usado + invalida os outros desse user.
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, id: { not: record.id } },
        data: { usedAt: now },
      }),
    ]);

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
    response.cookies.set(getUserCookieName(), user.id, getCookieOptions());
    return response;
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json(
        { error: 'invalido', message: e.issues[0]?.message ?? 'Dados invalidos.' },
        { status: 400 },
      );
    }
    console.error('[POST /api/auth/reset] erro:', e?.message);
    return NextResponse.json({ error: 'erro', message: 'Erro ao redefinir senha.' }, { status: 500 });
  }
}
