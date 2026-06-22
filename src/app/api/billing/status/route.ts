import { NextRequest, NextResponse } from 'next/server';
import { getUserCookieName } from '@/lib/session';
import { getPlanStatus } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });
  const status = await getPlanStatus(uid);
  // Infinity nao serializa em JSON; manda null pra UI tratar como ilimitado.
  return NextResponse.json({
    plan: status.plan,
    isPro: status.isPro,
    trialActive: status.trialActive,
    trialEndsAt: status.trialEndsAt,
    trialDaysLeft: status.trialDaysLeft,
    monthlyNewTxCount: status.monthlyNewTxCount,
    monthlyNewTxLimit: Number.isFinite(status.monthlyNewTxLimit)
      ? status.monthlyNewTxLimit
      : null,
    monthlyNewTxRemaining: Number.isFinite(status.monthlyNewTxRemaining)
      ? status.monthlyNewTxRemaining
      : null,
  });
}
