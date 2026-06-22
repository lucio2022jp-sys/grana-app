import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCookieOptions, getUserCookieName } from '@/lib/session';
import {
  canCreateNewTransaction,
  consumeTransactionQuota,
  ensureTrialOnNewUser,
} from '@/lib/billing';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  date: z.string(),
  amount: z.number(),
  description: z.string(),
  contraparte: z.string().optional(),
  type: z.enum(['receita', 'despesa', 'transferencia', 'pessoal', 'prolabore', 'retirada', 'emprestimo', 'investimento', 'reembolso']),
  category: z.string(),
  isDeductible: z.boolean().optional(),
  isPersonal: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const cookieName = getUserCookieName();
    const uid = req.cookies.get(cookieName)?.value;
    if (!uid) return NextResponse.json({ transactions: [] });

    const url = new URL(req.url);
    const month = url.searchParams.get('month'); // YYYY-MM
    const type = url.searchParams.get('type');

    const where: any = { userId: uid };
    if (month) {
      const [y, m] = month.split('-').map(Number);
      where.date = {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1),
      };
    }
    if (type) where.type = type;

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 200,
    });

    return NextResponse.json({ transactions });
  } catch (e: any) {
    console.error('[GET /api/transactions] erro:', e?.message, e?.code);
    return NextResponse.json(
      { error: 'db_error', message: e?.message ?? 'erro desconhecido', code: e?.code ?? null },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const cookieName = getUserCookieName();
    let uid = req.cookies.get(cookieName)?.value;
    let user = uid ? await prisma.user.findUnique({ where: { id: uid } }) : null;
    if (!user) {
      user = await prisma.user.create({ data: {} });
      uid = user.id;
      // Conta nova ganha 7 dias de trial Pro automatico.
      await ensureTrialOnNewUser(user.id);
    }

    // Gate de billing: free tem limite de lancamentos novos por mes.
    // Trial Pro (7 dias) e plano Pro pulam o gate.
    const gate = await canCreateNewTransaction(user.id);
    if (!gate.ok) {
      return NextResponse.json(
        {
          error: 'limit_reached',
          message: `Voce atingiu o limite de ${gate.status.monthlyNewTxLimit} lancamentos novos no mes do plano Free. Faca upgrade pra Pro pra liberar ilimitado.`,
          plan: gate.status,
        },
        { status: 402 },
      );
    }

    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date(data.date),
        amount: data.amount,
        description: data.description,
        contraparte: data.contraparte,
        type: data.type,
        category: data.category,
        isDeductible: data.isDeductible ?? false,
        isPersonal: data.isPersonal ?? false,
        source: 'manual',
        userConfirmed: true,
        imported: false,
      },
    });

    // Consome cota apos sucesso. Nao falhar a request se isso der erro.
    try {
      await consumeTransactionQuota(user.id);
    } catch (err) {
      console.error('[POST /api/transactions] erro ao consumir cota:', err);
    }

    const response = NextResponse.json({ transaction: tx });
    response.cookies.set(cookieName, user.id, getCookieOptions());
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
