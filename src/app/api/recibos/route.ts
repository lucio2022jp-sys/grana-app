/**
 * Gera um recibo persistido. O PDF em si e gerado no client (jsPDF).
 * O server so registra no banco pra ter historico/numero sequencial.
 *
 * POST /api/recibos
 *   body: { clienteId?, valor, descricao, data?, clienteNome?, clienteDoc?, clienteContato? }
 *   Se clienteId vier, usa snapshot do cliente. Senao, exige clienteNome.
 *
 * GET /api/recibos
 *   Lista os ultimos 50 recibos do user, com info do cliente.
 *
 * O numero e sequencial por user, comecando em 1. Sob race condition de
 * 2 recibos criados ao mesmo tempo, o unique (userId, numero) garante
 * que um dos dois falhe e a UI re-tenta. Pra V1 isso e suficiente.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  clienteId: z.string().optional().nullable(),
  valor: z.number().positive(),
  descricao: z.string().min(1).max(300),
  data: z.string().optional(), // ISO; default agora
  clienteNome: z.string().optional(),
  clienteDoc: z.string().optional().nullable(),
  clienteContato: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const recibos = await prisma.recibo.findMany({
    where: { userId: uid },
    orderBy: { data: 'desc' },
    take: 50,
    include: { cliente: { select: { id: true, nome: true } } },
  });

  return NextResponse.json({ recibos });
}

export async function POST(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const body = createSchema.parse(await req.json());

  // Resolve dados do cliente (snapshot)
  let nome = body.clienteNome?.trim() ?? '';
  let doc = body.clienteDoc?.replace(/\D/g, '') || null;
  let contato = body.clienteContato?.trim() || null;
  let clienteId = body.clienteId ?? null;

  if (clienteId) {
    const c = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!c || c.userId !== uid) {
      return NextResponse.json({ error: 'Cliente invalido' }, { status: 400 });
    }
    nome = c.nome;
    doc = c.doc ?? doc;
    contato = c.whatsapp ?? c.email ?? contato;
  }

  if (!nome) {
    return NextResponse.json(
      { error: 'Informe o cliente' },
      { status: 400 },
    );
  }

  // Pega proximo numero (max + 1)
  const last = await prisma.recibo.findFirst({
    where: { userId: uid },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  const numero = (last?.numero ?? 0) + 1;

  const data = body.data ? new Date(body.data) : new Date();

  const recibo = await prisma.recibo.create({
    data: {
      userId: uid,
      clienteId: clienteId,
      numero,
      data,
      valor: body.valor,
      descricao: body.descricao.trim(),
      clienteNome: nome,
      clienteDoc: doc,
      clienteContato: contato,
    },
  });

  return NextResponse.json({ recibo });
}
