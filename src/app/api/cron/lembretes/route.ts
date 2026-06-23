/**
 * Cron diaria de lembretes.
 *
 * Configurada na Vercel via vercel.json (1x ao dia, 09:00 BRT == 12:00 UTC).
 * Protegida por CRON_SECRET — chamada precisa enviar o header
 *   Authorization: Bearer $CRON_SECRET
 * Sem o secret a rota responde 401 e nao roda nada.
 *
 * Em ambiente sem CRON_SECRET configurado, exigimos NODE_ENV !== 'production'
 * pra deixar a rota disponivel pra teste manual local. Em prod sem secret, recusa.
 */

import { NextResponse } from 'next/server';
import {
  runDasDueReminders,
  runDasnReminders,
  runInactivityReminders,
  runMeiCapReminders,
  runTrialReminders,
} from '@/lib/reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const header = req.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

async function run() {
  const results = await Promise.allSettled([
    runDasDueReminders(),
    runInactivityReminders(),
    runMeiCapReminders(),
    runTrialReminders(),
    runDasnReminders(),
  ]);
  return results.map((r) =>
    r.status === 'fulfilled'
      ? { ok: true, ...r.value }
      : { ok: false, error: String(r.reason) },
  );
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const summary = await run();
  return NextResponse.json({ ranAt: new Date().toISOString(), summary });
}

// POST aceito pra agendadores que so mandam POST.
export const POST = GET;
