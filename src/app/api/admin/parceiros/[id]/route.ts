import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';
import { z } from 'zod';

const updateSchema = z.object({
  nome: z.string().optional(),
  foto: z.string().optional(),
  especialidade: z.string().optional(),
  cidade: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  preco: z.string().optional(),
  bio: z.string().max(500).optional(),
  ordem: z.number().optional(),
  ativo: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Sem permissao' }, { status: 401 });

  const parceiro = await prisma.contadorParceiro.findUnique({
    where: { id: params.id },
    include: {
      avaliacoes: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { name: true } } },
      },
      indicacoes: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!parceiro) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }
  return NextResponse.json({ parceiro });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Sem permissao' }, { status: 401 });
  const body = updateSchema.parse(await req.json());
  const parceiro = await prisma.contadorParceiro.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json({ parceiro });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Sem permissao' }, { status: 401 });
  await prisma.contadorParceiro.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
