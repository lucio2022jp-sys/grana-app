/**
 * CRUD de clientes recorrentes da MEI.
 *
 * GET /api/clientes              -> lista todos com totais agregados
 * POST /api/clientes             -> cria (auto-merge se ja existe doc igual)
 *
 * Estrategia de merge: se o cliente novo tiver o mesmo `doc` (CPF/CNPJ
 * canonizado em digitos) de um cliente existente do user, retorna o
 * existente em vez de duplicar. Isso e importante porque o app pode
 * sugerir cadastrar a partir de uma transacao, e queremos consolidar.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  nome: z.string().min(1).max(120),
  doc: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function digitsOnly(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = s.replace(/\D/g, '');
  return d.length > 0 ? d : null;
}

export async function GET(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  // Busca clientes + agregados de recibos
  const clientes = await prisma.cliente.findMany({
    where: { userId: uid },
    orderBy: { nome: 'asc' },
    include: {
      _count: { select: { recibos: true } },
      recibos: {
        select: { valor: true, data: true },
        orderBy: { data: 'desc' },
        take: 1,
      },
    },
  });

  // Agrega total de recibos por cliente (separado pq o include acima so pega 1)
  const totals = await prisma.recibo.groupBy({
    by: ['clienteId'],
    where: { userId: uid, clienteId: { not: null } },
    _sum: { valor: true },
  });
  const totalsMap = new Map(totals.map((t) => [t.clienteId, t._sum.valor ?? 0]));

  const out = clientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    doc: c.doc,
    whatsapp: c.whatsapp,
    email: c.email,
    endereco: c.endereco,
    notes: c.notes,
    recibosCount: c._count.recibos,
    totalRecibos: totalsMap.get(c.id) ?? 0,
    ultimoAtendimento: c.recibos[0]?.data ?? null,
  }));

  return NextResponse.json({ clientes: out });
}

export async function POST(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const body = createSchema.parse(await req.json());
  const docCanon = digitsOnly(body.doc);

  // Auto-merge por doc, se foi informado
  if (docCanon) {
    const existing = await prisma.cliente.findFirst({
      where: { userId: uid, doc: docCanon },
    });
    if (existing) {
      // Atualiza dados se o novo trouxe campos que faltavam
      const updated = await prisma.cliente.update({
        where: { id: existing.id },
        data: {
          nome: body.nome || existing.nome,
          whatsapp: body.whatsapp ?? existing.whatsapp,
          email: body.email ?? existing.email,
          endereco: body.endereco ?? existing.endereco,
          notes: body.notes ?? existing.notes,
        },
      });
      return NextResponse.json({ cliente: updated, merged: true });
    }
  }

  const cliente = await prisma.cliente.create({
    data: {
      userId: uid,
      nome: body.nome.trim(),
      doc: docCanon,
      whatsapp: body.whatsapp?.trim() || null,
      email: body.email?.trim() || null,
      endereco: body.endereco?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });

  return NextResponse.json({ cliente });
}
