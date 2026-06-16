import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCookieOptions, getUserCookieName } from '@/lib/session';
import { z } from 'zod';

const updateSchema = z.object({
  profissao: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  regime: z.enum(['mei', 'simples', 'nenhum']).optional(),
  meiAtividade: z.string().optional(),
  meiInicio: z.string().optional(),
  simplesAnexo: z.enum(['I', 'III', 'IV', 'V']).optional(),
  simplesInicio: z.string().optional(),
  contadorNome: z.string().optional(),
  contadorWhatsapp: z.string().optional(),
  contadorEmail: z.string().email().optional().or(z.literal('')),
});

export async function GET(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;

  if (!uid) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({ where: { id: uid } });
  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    // Converte datas string -> Date
    const dbData: any = { ...data };
    if (data.meiInicio) {
      dbData.meiInicio = new Date(data.meiInicio);
    }
    if (data.simplesInicio) {
      dbData.simplesInicio = new Date(data.simplesInicio);
    }

    const cookieName = getUserCookieName();
    let uid = req.cookies.get(cookieName)?.value;
    let user = uid ? await prisma.user.findUnique({ where: { id: uid } }) : null;

    if (!user) {
      user = await prisma.user.create({ data: dbData });
    } else {
      user = await prisma.user.update({ where: { id: user.id }, data: dbData });
    }

    const response = NextResponse.json({ user });
    response.cookies.set(cookieName, user.id, getCookieOptions());
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
