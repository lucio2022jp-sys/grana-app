import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCookieOptions, getUserCookieName } from '@/lib/session';
import { hashPassword, normalizeEmail } from '@/lib/auth';
import { lookupReferrer } from '@/lib/referral';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.').max(80),
  email: z.string().trim().email('E-mail invalido.'),
  password: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres.').max(200),
  profissao: z.string().optional(),
  ref: z.string().trim().max(16).optional(),
  // Origem do clique de indicacao (share/copy/whatsapp/link). Persistido
  // pra medir qual canal converte melhor. Limitado a 32 chars pra evitar
  // injecao de strings gigantes de UTM mal-formado.
  utmMedium: z.string().trim().max(32).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const email = normalizeEmail(data.email);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'email_em_uso', message: 'Ja existe uma conta com esse e-mail. Faca login.' },
        { status: 409 },
      );
    }

    // Resolve indicador antes de criar (evita gravar codigo invalido).
    const referredById = data.ref ? await lookupReferrer(data.ref) : null;

    const passwordHash = hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: data.name.trim(),
        profissao: data.profissao,
        referredById,
        // So persiste utmMedium se a conta veio mesmo de uma indicacao
        // valida — utm sem ref nao significa nada pro programa.
        referralUtmMedium: referredById ? data.utmMedium ?? null : null,
      },
    });

    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
    response.cookies.set(getUserCookieName(), user.id, getCookieOptions());
    return response;
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: 'invalido', message: e.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
    }
    console.error('[POST /api/auth/signup] erro:', e?.message);
    return NextResponse.json({ error: 'erro', message: e?.message ?? 'Erro ao criar conta.' }, { status: 500 });
  }
}
