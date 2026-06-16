import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  month: z.string().optional(), // YYYY-MM, default mes corrente
  ids: z.array(z.string()).optional(), // se quiser especificar quais (default = todas pessoais do mes)
});

/**
 * Converte transacoes pessoais em uma retirada formal.
 *
 * Como funciona:
 *  1. Pega todas as transacoes do mes com type=pessoal (ou IDs especificos)
 *  2. Soma o valor total
 *  3. Cria UMA nova transacao do tipo "retirada" com esse valor
 *  4. Apaga as pessoais originais (mas guarda os dados em notes pra poder reverter)
 *
 * Resultado: contabilidade fica limpa - retirada e legitimo, mistura nao.
 */
export async function POST(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const body = schema.parse(await req.json().catch(() => ({})));

  // Define mes
  const now = new Date();
  const [y, m] = body.month
    ? body.month.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  // Busca transacoes a converter
  const where: any = {
    userId: uid,
    type: 'pessoal',
    date: { gte: start, lt: end },
  };
  if (body.ids && body.ids.length > 0) {
    where.id = { in: body.ids };
  }

  const pessoais = await prisma.transaction.findMany({ where });

  if (pessoais.length === 0) {
    return NextResponse.json({
      error: 'Nenhuma transacao pessoal encontrada nesse periodo',
    }, { status: 400 });
  }

  // Soma o valor total (em modulo - retirada e sempre saida)
  const totalAbsoluto = pessoais.reduce((s, t) => s + Math.abs(t.amount), 0);
  const valorRetirada = -totalAbsoluto; // negativo (saida)

  // Data: usa a data mais antiga das transacoes pessoais
  const dataRetirada = pessoais
    .map((t) => t.date)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  // Guarda no notes os IDs originais e detalhes pra poder reverter ou auditar
  const detalhes = {
    convertedFrom: pessoais.map((t) => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      description: t.description,
      contraparte: t.contraparte,
      category: t.category,
    })),
    convertedAt: new Date().toISOString(),
    convertedCount: pessoais.length,
    convertedTotal: totalAbsoluto,
  };

  // Faz tudo numa transacao do banco pra atomicidade
  const result = await prisma.$transaction(async (tx) => {
    // Cria a retirada consolidada
    const retirada = await tx.transaction.create({
      data: {
        userId: uid,
        date: dataRetirada,
        amount: valorRetirada,
        description: `Retirada formal (${pessoais.length} ${pessoais.length === 1 ? 'gasto pessoal consolidado' : 'gastos pessoais consolidados'})`,
        contraparte: 'Retirada do socio',
        type: 'retirada',
        category: 'retirada',
        isDeductible: false,
        isPersonal: false,
        source: 'manual',
        userConfirmed: true,
        notes: JSON.stringify(detalhes),
      },
    });

    // Apaga as transacoes pessoais convertidas
    await tx.transaction.deleteMany({
      where: { id: { in: pessoais.map((t) => t.id) } },
    });

    return retirada;
  });

  return NextResponse.json({
    ok: true,
    retirada: {
      id: result.id,
      amount: result.amount,
      date: result.date,
      convertedCount: pessoais.length,
    },
  });
}

/**
 * Reverte uma conversao - restaura as transacoes pessoais originais.
 * Recebe o ID da retirada criada pela conversao.
 */
export async function DELETE(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const url = new URL(req.url);
  const retiradaId = url.searchParams.get('retiradaId');
  if (!retiradaId) {
    return NextResponse.json({ error: 'retiradaId obrigatorio' }, { status: 400 });
  }

  const retirada = await prisma.transaction.findUnique({ where: { id: retiradaId } });
  if (!retirada || retirada.userId !== uid || retirada.type !== 'retirada') {
    return NextResponse.json({ error: 'Retirada nao encontrada' }, { status: 404 });
  }

  if (!retirada.notes) {
    return NextResponse.json({ error: 'Essa retirada nao foi feita por conversao' }, { status: 400 });
  }

  let detalhes: any;
  try {
    detalhes = JSON.parse(retirada.notes);
  } catch {
    return NextResponse.json({ error: 'Notes invalido' }, { status: 400 });
  }

  if (!Array.isArray(detalhes.convertedFrom)) {
    return NextResponse.json({ error: 'Sem dados pra reverter' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    // Recria as transacoes pessoais originais
    for (const orig of detalhes.convertedFrom) {
      await tx.transaction.create({
        data: {
          userId: uid,
          date: new Date(orig.date),
          amount: orig.amount,
          description: orig.description,
          contraparte: orig.contraparte,
          type: 'pessoal',
          category: orig.category,
          isDeductible: false,
          isPersonal: true,
          source: 'manual',
          userConfirmed: true,
        },
      });
    }
    // Apaga a retirada consolidada
    await tx.transaction.delete({ where: { id: retiradaId } });
  });

  return NextResponse.json({
    ok: true,
    restored: detalhes.convertedFrom.length,
  });
}
