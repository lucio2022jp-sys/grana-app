import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';
import { z } from 'zod';

const createSchema = z.object({
  nome: z.string().min(2),
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

/**
 * Lista todos os parceiros (admin ve tudo, ativo e inativo).
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 401 });
  }

  const parceiros = await prisma.contadorParceiro.findMany({
    orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: {
        select: { indicacoes: true, avaliacoes: true },
      },
    },
  });

  return NextResponse.json({ parceiros });
}

/**
 * Cria parceiro novo.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 401 });
  }
  const body = createSchema.parse(await req.json());
  const parceiro = await prisma.contadorParceiro.create({ data: body });
  return NextResponse.json({ parceiro });
}
