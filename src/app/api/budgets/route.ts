/**
 * Endpoints de orcamento por categoria.
 *
 *  GET    /api/budgets        -> lista com progresso do mes corrente
 *  POST   /api/budgets        -> cria/atualiza (upsert por categoria)
 *  DELETE /api/budgets?id=... -> remove
 *
 * Tudo autenticado pelo cookie de sessao; sem userId valido devolvemos
 * lista vazia em GET e 401 nas outras operacoes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { getBudgetsProgress, getTopCategoriesNoBudget } from '@/lib/budget';

export const dynamic = 'force-dynamic';

const upsertSchema = z.object({
  category: z.string().min(1).max(60),
  monthlyLimit: z.number().positive().max(1_000_000),
  alertThreshold: z.number().int().min(1).max(100).optional(),
});

function getUid(req: NextRequest): string | null {
  return req.cookies.get(getUserCookieName())?.value ?? null;
}

export async function GET(req: NextRequest) {
  const uid = getUid(req);
  if (!uid) return NextResponse.json({ budgets: [], suggestions: [] });

  const [budgets, suggestions] = await Promise.all([
    getBudgetsProgress(uid),
    getTopCategoriesNoBudget(uid),
  ]);

  return NextResponse.json({ budgets, suggestions });
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

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { category, monthlyLimit, alertThreshold = 80 } = parsed.data;

  const budget = await prisma.budget.upsert({
    where: { userId_category: { userId: uid, category } },
    create: { userId: uid, category, monthlyLimit, alertThreshold },
    update: { monthlyLimit, alertThreshold },
  });

  return NextResponse.json({ budget });
}

export async function DELETE(req: NextRequest) {
  const uid = getUid(req);
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  // Garante que so apaga orcamento do proprio usuario
  const result = await prisma.budget.deleteMany({ where: { id, userId: uid } });
  if (result.count === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
