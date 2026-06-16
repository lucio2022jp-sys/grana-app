import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName, getCookieOptions } from '@/lib/session';
import { z } from 'zod';

const schema = z.object({
  parceiroId: z.string(),
});

/**
 * MEI escolhe um contador parceiro.
 *
 *  - Cria registro de Indicacao
 *  - Atualiza User com dados do contador (nome, whatsapp, email)
 *  - Retorna link de WhatsApp pre-formatado pra abrir conversa
 */
export async function POST(req: NextRequest) {
  const { parceiroId } = schema.parse(await req.json());

  const cookieName = getUserCookieName();
  let uid = req.cookies.get(cookieName)?.value;
  let user = uid ? await prisma.user.findUnique({ where: { id: uid } }) : null;
  if (!user) {
    user = await prisma.user.create({ data: {} });
    uid = user.id;
  }

  const parceiro = await prisma.contadorParceiro.findUnique({
    where: { id: parceiroId },
  });

  if (!parceiro || !parceiro.ativo) {
    return NextResponse.json({ error: 'Parceiro nao disponivel' }, { status: 404 });
  }

  // Cria indicacao
  const indicacao = await prisma.indicacao.create({
    data: {
      userId: user.id,
      parceiroId: parceiro.id,
      status: 'enviada',
    },
  });

  // Atualiza dados do contador no perfil do user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      contadorNome: parceiro.nome,
      contadorWhatsapp: parceiro.whatsapp ?? null,
      contadorEmail: parceiro.email ?? null,
    },
  });

  // Monta link de WhatsApp
  let whatsappUrl: string | null = null;
  if (parceiro.whatsapp) {
    let numero = parceiro.whatsapp.replace(/\D/g, '');
    if (!numero.startsWith('55') && numero.length >= 10) numero = '55' + numero;
    const msg = encodeURIComponent(
      `Oi ${parceiro.nome}! Vi seu contato pelo app Grana e queria conversar sobre virar cliente. Me chamo ${user.name ?? '(nome)'}.`,
    );
    whatsappUrl = `https://wa.me/${numero}?text=${msg}`;
  }

  const response = NextResponse.json({
    ok: true,
    indicacaoId: indicacao.id,
    parceiro: {
      id: parceiro.id,
      nome: parceiro.nome,
      whatsapp: parceiro.whatsapp,
      email: parceiro.email,
    },
    whatsappUrl,
  });

  response.cookies.set(cookieName, user.id, getCookieOptions());
  return response;
}

/**
 * Lista indicacoes do user logado (pra ele acompanhar).
 */
export async function GET(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ indicacoes: [] });

  const indicacoes = await prisma.indicacao.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
    include: {
      parceiro: {
        select: { id: true, nome: true, foto: true, especialidade: true },
      },
    },
  });

  return NextResponse.json({ indicacoes });
}
