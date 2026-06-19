/**
 * Endpoints da reserva de impostos.
 *
 *  GET    /api/tax-reserve              -> mes corrente + historico
 *  GET    /api/tax-reserve?year=&month= -> mes especifico
 *  POST   /api/tax-reserve              -> registra contribuicao
 *  DELETE /api/tax-reserve?id=...       -> remove contribuicao
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { getReserveMonth, getReserveHistory } from '@/lib/tax-reserve';

export const dynamic = 'force-dynamic';

const contribSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  note: z.string().max(200).optional(),
  auto: z.boolean().optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

function getUid(req: NextRequest): string | null {
  return req.cookies.get(getUserCookieName())?.value ?? null;
}

function todayYM() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export async function GET(req: NextRequest) {
  const uid = getUid(req);
  if (!uid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { year: ty, month: tm } = todayYM();
  const yearParam = req.nextUrl.searchParams.get('year');
  const monthParam = req.nextUrl.searchParams.get('month');
  const year = yearParam ? parseInt(yearParam, 10) : ty;
  const month = monthParam ? parseInt(monthParam, 10) : tm;

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return NextResponse.json({ error: 'invalid_period' }, { status: 400 });
  }

  const [current, history] = await Promise.all([
    getReserveMonth(uid, year, month),
    getReserveHistory(uid, 6),
  ]);

  return NextResponse.json({ current, history });
}

export async function POST(req: NextRequest) {
  const uid = getUid(req);
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = contribSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { year: ty, month: tm } = todayYM();
  const { amount, note, auto = false } = parsed.data;
  const year = parsed.data.year ?? ty;
  const month = parsed.data.month ?? tm;

  const reserve = await prisma.taxReserve.create({
    data: {
      userId: uid,
      year,
      month,
      amount,
      note: note ?? null,
      auto,
    },
  });

  return NextResponse.json({ reserve });
}

export async function DELETE(req: NextRequest) {
  const uid = getUid(req);
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const result = await prisma.taxReserve.deleteMany({ where: { id, userId: uid } });
  if (result.count === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
