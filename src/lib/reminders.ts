/**
 * Logica e templates de lembretes do Grana.
 *
 * Sao tres tipos pensados em junho/2026:
 *   1. DAS proximo do vencimento (MEI/Simples) — entre D-5 e D-1.
 *   2. Inatividade — usuario sem lancar nada ha 7+ dias.
 *   3. Meta de faturamento — quando bate 80% do teto MEI no ano corrente.
 *
 * Cada lembrete eh idempotente via ReminderLog (userId+kind+reference).
 * O endpoint /api/cron/lembretes chama estas funcoes; ele eh agendado pra
 * rodar 1x por dia (cron na vercel ou similar).
 */

import { prisma } from '@/lib/db';
import { sendGenericEmail } from '@/lib/mailer';

// Teto MEI 2026 (R$ 81.000 ate ajuste oficial). Ajustar quando sair lei nova.
const TETO_MEI_ANO = 81000;
const ALERTA_PCT = 0.8; // 80%

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function shell(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="pt-br"><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#fafafa;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <h1 style="margin:0 0 16px;font-size:20px;color:#111;">${escapeHtml(title)}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 0;color:#888;font-size:12px;">
      Voce recebeu esse e-mail porque tem lembretes ligados no Grana.
      Pra desligar, abra o app em Configuracoes > Lembretes.
    </p>
  </div>
</body></html>`;
}

async function alreadySent(userId: string, kind: string, reference: string) {
  const found = await prisma.reminderLog.findUnique({
    where: { userId_kind_reference: { userId, kind, reference } },
  });
  return !!found;
}

async function markSent(userId: string, kind: string, reference: string) {
  await prisma.reminderLog.create({ data: { userId, kind, reference } });
}

/** Lembrete: DAS proximo do vencimento (entre 5 e 1 dia antes). */
export async function runDasDueReminders(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 5); // janela: hoje ate +5 dias

  const pendings = await prisma.dASPayment.findMany({
    where: {
      paidAt: null,
      dueDate: { gte: start, lte: end },
      user: { reminderDasEnabled: true, email: { not: null } },
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  let sent = 0;
  for (const p of pendings) {
    const ref = `das:${p.year}-${String(p.month).padStart(2, '0')}`;
    if (await alreadySent(p.userId, 'das_due', ref)) continue;

    const dias = Math.max(
      0,
      Math.ceil((p.dueDate.getTime() - start.getTime()) / 86400000),
    );
    const quando = dias === 0 ? 'hoje' : dias === 1 ? 'amanha' : `em ${dias} dias`;
    const venc = p.dueDate.toLocaleDateString('pt-BR');

    const html = shell(
      `Seu DAS vence ${quando}`,
      `<p style="margin:0 0 12px;color:#333;line-height:1.5;">
        ${p.user.name ? `Oi, ${escapeHtml(p.user.name)}!` : 'Oi!'} Passando pra avisar
        que o DAS de <strong>${String(p.month).padStart(2, '0')}/${p.year}</strong>
        no valor de <strong>${brl(p.value)}</strong> vence ${quando} (${venc}).
      </p>
      <p style="margin:0;color:#555;font-size:13px;">
        Quando pagar, marca como pago la no app pra eu parar de te encher.
      </p>`,
    );
    const text = `Seu DAS de ${p.month}/${p.year} (${brl(p.value)}) vence ${quando} (${venc}).`;

    const r = await sendGenericEmail({
      to: p.user.email,
      subject: `DAS vence ${quando} — ${brl(p.value)}`,
      html,
      text,
    });
    if (r.sent) {
      await markSent(p.userId, 'das_due', ref);
      sent++;
    }
  }
  return { kind: 'das_due', candidates: pendings.length, sent };
}

/** Lembrete: usuario sem lancar nada ha 7+ dias. Dispara 1x por semana ISO. */
export async function runInactivityReminders(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      reminderInactivityEnabled: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      transactions: {
        select: { date: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  });

  const ref = isoWeekRef(now); // ex: 2026-W25

  let sent = 0;
  for (const u of users) {
    const last = u.transactions[0]?.date;
    if (!last) continue; // ignora quem ainda nao tem nada — onboarding cuida disso
    if (last >= cutoff) continue; // ativo, deixa em paz
    if (await alreadySent(u.id, 'inactivity_week', ref)) continue;

    const dias = Math.floor((now.getTime() - last.getTime()) / 86400000);
    const html = shell(
      'Faz tempo que voce nao registra nada',
      `<p style="margin:0 0 12px;color:#333;line-height:1.5;">
        ${u.name ? `Oi, ${escapeHtml(u.name)}!` : 'Oi!'} Voce ta ha
        <strong>${dias} dias</strong> sem lancar uma entrada ou saida no Grana.
      </p>
      <p style="margin:0 0 12px;color:#333;line-height:1.5;">
        Se rolou movimento por ai, vale dar uma passada rapida pra nao acumular —
        importar o extrato resolve em poucos cliques.
      </p>`,
    );
    const r = await sendGenericEmail({
      to: u.email,
      subject: `${dias} dias sem registrar nada no Grana`,
      html,
      text: `Voce ta ha ${dias} dias sem lancar nada no Grana.`,
    });
    if (r.sent) {
      await markSent(u.id, 'inactivity_week', ref);
      sent++;
    }
  }
  return { kind: 'inactivity_week', candidates: users.length, sent };
}

/** Lembrete: usuario MEI bateu 80% do teto anual. */
export async function runMeiCapReminders(now = new Date()) {
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  const users = await prisma.user.findMany({
    where: {
      regime: 'MEI',
      email: { not: null },
      reminderDasEnabled: true, // reusa flag de fiscal — mesmo eixo
    },
    select: { id: true, email: true, name: true },
  });

  const ref = `mei_cap:${now.getFullYear()}`;
  let sent = 0;

  for (const u of users) {
    if (await alreadySent(u.id, 'mei_cap_80', ref)) continue;

    const agg = await prisma.transaction.aggregate({
      where: {
        userId: u.id,
        type: 'income',
        isPersonal: false,
        date: { gte: yearStart, lt: yearEnd },
      },
      _sum: { amount: true },
    });
    const total = agg._sum.amount ?? 0;
    if (total < TETO_MEI_ANO * ALERTA_PCT) continue;

    const restante = Math.max(0, TETO_MEI_ANO - total);
    const html = shell(
      'Voce esta perto do teto do MEI',
      `<p style="margin:0 0 12px;color:#333;line-height:1.5;">
        ${u.name ? `Oi, ${escapeHtml(u.name)}!` : 'Oi!'} Seu faturamento de
        ${now.getFullYear()} ja passou de <strong>${brl(total)}</strong>,
        sobrando <strong>${brl(restante)}</strong> ate o teto MEI de
        ${brl(TETO_MEI_ANO)}.
      </p>
      <p style="margin:0;color:#555;font-size:13px;">
        Vale conversar com seu contador sobre desenquadramento pra ME no proximo ano
        antes de bater 100% — passou do teto, vira pessoa juridica retroativa.
      </p>`,
    );
    const r = await sendGenericEmail({
      to: u.email,
      subject: `Voce ja faturou ${brl(total)} esse ano`,
      html,
      text: `Faturamento ${now.getFullYear()}: ${brl(total)}. Restam ${brl(restante)} ate o teto MEI.`,
    });
    if (r.sent) {
      await markSent(u.id, 'mei_cap_80', ref);
      sent++;
    }
  }
  return { kind: 'mei_cap_80', candidates: users.length, sent };
}

/** Devolve "YYYY-Www" pra deduplicar lembrete semanal por semana ISO. */
function isoWeekRef(d: Date) {
  // Algoritmo ISO-8601: thursday-of-week determina o ano da semana.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
