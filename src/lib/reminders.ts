/**
 * Logica e templates de lembretes do Grana.
 *
 * Sao cinco tipos pensados em junho/2026:
 *   1. DAS proximo do vencimento (MEI/Simples) — entre D-5 e D-1.
 *   2. Inatividade — usuario sem lancar nada ha 7+ dias.
 *   3. Meta de faturamento — quando bate 80% do teto MEI no ano corrente.
 *   4. Sequencia do trial Pro de 7 dias — D+1, D+3, D+6, D+8 (expirado).
 *   5. DASN-SIMEI — 15/jan (abriu), 1/maio (1 mes pro prazo), 25/maio (6 dias).
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

/** Devolve "YYYY-MM-DD" da data, em UTC, pra usar como reference idempotente. */
function dayRef(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Sequencia de lembretes do trial de 7 dias.
 *
 * Marcos (contando dias desde signup, considerando trialEndsAt = signup + 7d):
 *   - D+1: "comece por aqui" (faltam 6 dias)
 *   - D+3: "veja seu dashboard" (faltam 4 dias)
 *   - D+6: "amanha acaba" (falta 1 dia)
 *   - D+8: "trial acabou — vira Pro ou vai pra Free" (passou 1 dia do fim)
 *
 * Cada marco eh idempotente via ReminderLog (kind unico + reference = data do
 * trialEndsAt em YYYY-MM-DD). So roda pra quem ainda eh "free" — quem assinou
 * Pro nao recebe.
 */
export async function runTrialReminders(now = new Date()) {
  // Janela de busca: trialEndsAt entre (now - 2d) e (now + 8d) cobre todos os marcos
  // com folga, e mantem a query enxuta.
  const lo = new Date(now);
  lo.setDate(lo.getDate() - 2);
  const hi = new Date(now);
  hi.setDate(hi.getDate() + 8);

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      plan: 'free',
      trialEndsAt: { gte: lo, lte: hi },
    },
    select: {
      id: true,
      email: true,
      name: true,
      trialEndsAt: true,
    },
  });

  // Cada marco: dias antes(+)/depois(-) do trialEndsAt, kind, e gerador de subject+corpo.
  // Convencao: daysToEnd = (trialEndsAt - now) em dias. Positivo = ainda falta tempo,
  // negativo = ja passou.
  const marcos: Array<{
    offsetDays: number;
    kind: string;
    build: (u: { name: string | null }) => { subject: string; html: string; text: string };
  }> = [
    {
      offsetDays: 6, // D+1 desde signup (faltam 6 dias pro fim)
      kind: 'trial_d1',
      build: (u) => {
        const oi = u.name ? `Oi, ${escapeHtml(u.name)}!` : 'Oi!';
        return {
          subject: 'Comeca por aqui: registra a primeira entrada',
          html: shell(
            'Comeca por aqui',
            `<p style="margin:0 0 12px;color:#333;line-height:1.5;">${oi} Bem-vinda ao Grana.</p>
            <p style="margin:0 0 12px;color:#333;line-height:1.5;">
              No teu primeiro dia, faz uma coisa so: <strong>registra uma entrada e uma saida</strong>.
              Em 30 segundos o app ja monta teu dashboard.
            </p>
            <p style="margin:24px 0;">
              <a href="https://grana-app-sigma.vercel.app/app/nova" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:12px;">
                Registrar primeira transacao
              </a>
            </p>
            <p style="margin:0;color:#666;font-size:13px;">
              Dica: se voce tem extrato do banco, da pra importar o arquivo direto em <a href="https://grana-app-sigma.vercel.app/app/imports">/app/imports</a> — vai puxar tudo de uma vez.
            </p>`,
          ),
          text: `${oi} No primeiro dia, registra uma entrada e uma saida no Grana. Em 30s o dashboard ja monta. https://grana-app-sigma.vercel.app/app/nova`,
        };
      },
    },
    {
      offsetDays: 4, // D+3 (faltam 4 dias)
      kind: 'trial_d3',
      build: (u) => {
        const oi = u.name ? `Oi, ${escapeHtml(u.name)}!` : 'Oi!';
        return {
          subject: 'Ja viu quanto voce ganhou no mes?',
          html: shell(
            'Da uma olhada no teu dashboard',
            `<p style="margin:0 0 12px;color:#333;line-height:1.5;">${oi}</p>
            <p style="margin:0 0 12px;color:#333;line-height:1.5;">
              Faltam <strong>4 dias</strong> do teu trial Pro. Se voce ja lancou alguma coisa,
              vale dar uma passada no dashboard pra ver tudo organizado: quanto entrou, quanto saiu,
              quanto sobrou.
            </p>
            <p style="margin:24px 0;">
              <a href="https://grana-app-sigma.vercel.app/app" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:12px;">
                Abrir meu dashboard
              </a>
            </p>
            <p style="margin:0;color:#666;font-size:13px;">
              Ainda nao testou tirar foto de nota com IA? E em <a href="https://grana-app-sigma.vercel.app/app/notas-pendentes">/app/notas-pendentes</a>.
            </p>`,
          ),
          text: `${oi} Faltam 4 dias do trial. Da uma olhada no dashboard: https://grana-app-sigma.vercel.app/app`,
        };
      },
    },
    {
      offsetDays: 1, // D+6 (falta 1 dia)
      kind: 'trial_d6',
      build: (u) => {
        const oi = u.name ? `Oi, ${escapeHtml(u.name)}!` : 'Oi!';
        return {
          subject: 'Teu trial acaba amanha',
          html: shell(
            'Amanha vira Free',
            `<p style="margin:0 0 12px;color:#333;line-height:1.5;">${oi}</p>
            <p style="margin:0 0 12px;color:#333;line-height:1.5;">
              <strong>Amanha</strong> teu trial Pro acaba. Se voce continuar como Free, perde:
            </p>
            <ul style="margin:0 0 16px 20px;color:#333;line-height:1.6;">
              <li>Foto de nota com IA</li>
              <li>Recibos PDF ilimitados</li>
              <li>Lancamentos novos acima de 20/mes</li>
              <li>DASN-SIMEI pronta pra colar</li>
            </ul>
            <p style="margin:0 0 12px;color:#333;line-height:1.5;">
              Continuar Pro custa <strong>R$ 17,90/mes</strong> — cancela em 1 clique quando quiser.
            </p>
            <p style="margin:24px 0;">
              <a href="https://grana-app-sigma.vercel.app/app/upgrade" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:12px;">
                Continuar Pro por R$ 17,90/mes
              </a>
            </p>`,
          ),
          text: `${oi} Amanha teu trial acaba. Continuar Pro R$ 17,90/mes: https://grana-app-sigma.vercel.app/app/upgrade`,
        };
      },
    },
    {
      offsetDays: -1, // D+8 (passou 1 dia do fim)
      kind: 'trial_expired',
      build: (u) => {
        const oi = u.name ? `Oi, ${escapeHtml(u.name)}!` : 'Oi!';
        return {
          subject: 'Trial acabou — teu historico continua todo ai',
          html: shell(
            'Voltou pra Free',
            `<p style="margin:0 0 12px;color:#333;line-height:1.5;">${oi}</p>
            <p style="margin:0 0 12px;color:#333;line-height:1.5;">
              Teu trial Pro acabou ontem e a conta voltou pra Free.
              <strong>Teu historico continua todo ai</strong> — nada foi apagado.
            </p>
            <p style="margin:0 0 12px;color:#333;line-height:1.5;">
              No Free voce tem ate 20 lancamentos novos por mes e dashboard basico.
              Os recursos Pro (foto de nota com IA, recibos, DASN pronta) ficam bloqueados
              ate voce assinar.
            </p>
            <p style="margin:24px 0;">
              <a href="https://grana-app-sigma.vercel.app/app/upgrade" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:12px;">
                Virar Pro por R$ 17,90/mes
              </a>
            </p>
            <p style="margin:0;color:#666;font-size:13px;">
              Sem cartao na cara — assina quando fizer sentido pra ti.
            </p>`,
          ),
          text: `${oi} Trial acabou. Teu historico continua todo no Grana. Virar Pro: https://grana-app-sigma.vercel.app/app/upgrade`,
        };
      },
    },
  ];

  let sent = 0;
  let candidates = 0;
  for (const u of users) {
    if (!u.trialEndsAt) continue;
    const ref = dayRef(u.trialEndsAt);
    // Quantos dias faltam pro fim do trial. Negativo = ja passou.
    const daysToEnd = Math.round(
      (u.trialEndsAt.getTime() - now.getTime()) / 86400000,
    );

    for (const m of marcos) {
      // Bate o marco se daysToEnd estiver dentro de +/- 0.5 do offset.
      // Como cron roda 1x/dia, +/- 0 ja resolve, mas dou tolerancia de 1 pra robustez.
      if (daysToEnd !== m.offsetDays) continue;
      candidates++;
      if (await alreadySent(u.id, m.kind, ref)) continue;
      const { subject, html, text } = m.build({ name: u.name });
      const r = await sendGenericEmail({ to: u.email, subject, html, text });
      if (r.sent) {
        await markSent(u.id, m.kind, ref);
        sent++;
      }
    }
  }

  return { kind: 'trial_sequence', candidates, sent };
}

/**
 * Lembretes da DASN-SIMEI — declaracao anual obrigatoria do MEI.
 *
 * Tres marcos no calendario, todos referentes ao ano-base = ano anterior:
 *   - 15/jan: janela abriu, ja da pra declarar
 *   - 01/mai: falta 1 mes pro prazo (31/mai)
 *   - 25/mai: falta menos de 1 semana — multa de R$ 50 batendo
 *
 * Idempotencia: kind unico por marco + reference = ano-base (ex: "2025").
 * So envia pra MEI que ainda nao tem DasnRecibo do ano-base, e tambem corta
 * quem ja entregou direto pela RFB (a gente nao tem como saber sem recibo).
 *
 * Cada usuario recebe no maximo 1 email por dia desta categoria — se cair em
 * mais de um marco (caso patologico de cron atrasado), so o primeiro dispara.
 */
export async function runDasnReminders(now = new Date()) {
  // Tudo no fuso de Brasilia (America/Sao_Paulo). O calendario fiscal do
  // MEI eh em horario de Brasilia, e o cron da Vercel roda em UTC — sem
  // converter, um cron que dispara 12:00 UTC do dia 15/jan ainda esta no
  // dia 15/jan BRT (9h), mas se o agendador atrasar pra depois da meia
  // noite UTC a gente erra o marco. Forcar BRT elimina esse risco.
  const brt = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }),
  );

  // Ano-base eh sempre o ano anterior. Em 2026 a gente declara o 2025.
  const yearBase = brt.getFullYear() - 1;

  // Identifica em qual marco estamos. Comparamos so mes+dia, ignorando ano,
  // pra rodar todo ano automaticamente sem ajuste.
  const month = brt.getMonth() + 1; // 1..12
  const day = brt.getDate();

  const marcos = [
    {
      match: month === 1 && day === 15,
      kind: 'dasn_window_open',
      subject: () => `Janela DASN-SIMEI ${yearBase} abriu`,
      body: (name: string | null) => {
        const oi = name ? `Oi, ${escapeHtml(name)}!` : 'Oi!';
        return shell(
          `DASN-SIMEI ${yearBase}`,
          `<p style="margin:0 0 12px;color:#333;line-height:1.5;">${oi}</p>
          <p style="margin:0 0 12px;color:#333;line-height:1.5;">
            A janela da <strong>DASN-SIMEI ${yearBase}</strong> abriu hoje (15 de janeiro).
            Voce tem ate <strong>31/05/${yearBase + 1}</strong> pra entregar, mas o Grana
            ja monta os dois numeros que voce precisa colar no portal.
          </p>
          <p style="margin:24px 0;">
            <a href="https://grana-app-sigma.vercel.app/app/dasn" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:12px;">
              Ver meus numeros da DASN
            </a>
          </p>
          <p style="margin:0;color:#666;font-size:13px;">
            Depois que entregar, marca como "declarada" no Grana pra parar de receber esses lembretes.
          </p>`,
        );
      },
      text: () =>
        `Janela DASN-SIMEI ${yearBase} abriu. Ve teus numeros prontos: https://grana-app-sigma.vercel.app/app/dasn`,
    },
    {
      match: month === 5 && day === 1,
      kind: 'dasn_1month',
      subject: () => `Falta 1 mes pra entregar a DASN-SIMEI ${yearBase}`,
      body: (name: string | null) => {
        const oi = name ? `Oi, ${escapeHtml(name)}!` : 'Oi!';
        return shell(
          'DASN: 1 mes pro prazo',
          `<p style="margin:0 0 12px;color:#333;line-height:1.5;">${oi}</p>
          <p style="margin:0 0 12px;color:#333;line-height:1.5;">
            Falta <strong>1 mes</strong> (prazo 31/05) pra entregar a DASN-SIMEI ${yearBase}.
            Se ainda nao entregou, a multa por atraso eh de <strong>R$ 50</strong> minimo —
            melhor resolver agora.
          </p>
          <p style="margin:24px 0;">
            <a href="https://grana-app-sigma.vercel.app/app/dasn" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:12px;">
              Ver meus numeros e declarar
            </a>
          </p>
          <p style="margin:0;color:#666;font-size:13px;">
            No Grana voce ja tem os dois valores prontos pra colar. Leva 2 minutos no portal.
          </p>`,
        );
      },
      text: () =>
        `Falta 1 mes pra DASN-SIMEI ${yearBase}. Multa minima R$ 50: https://grana-app-sigma.vercel.app/app/dasn`,
    },
    {
      match: month === 5 && day === 25,
      kind: 'dasn_6days',
      subject: () => `URGENTE: 6 dias pra DASN-SIMEI ${yearBase}`,
      body: (name: string | null) => {
        const oi = name ? `Oi, ${escapeHtml(name)}!` : 'Oi!';
        return shell(
          'DASN: 6 dias pro prazo',
          `<p style="margin:0 0 12px;color:#333;line-height:1.5;">${oi}</p>
          <p style="margin:0 0 12px;color:#333;line-height:1.5;">
            <strong>6 dias</strong> pro fim do prazo (31/05) da DASN-SIMEI ${yearBase}.
            Atraso = <strong>R$ 50</strong> de multa minima.
          </p>
          <p style="margin:0 0 12px;color:#333;line-height:1.5;">
            Vai no Grana, copia os dois numeros, cola no portal. Acabou.
          </p>
          <p style="margin:24px 0;">
            <a href="https://grana-app-sigma.vercel.app/app/dasn" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:12px;">
              Declarar agora
            </a>
          </p>`,
        );
      },
      text: () =>
        `URGENTE: 6 dias pra DASN-SIMEI ${yearBase}. Multa R$ 50 a partir de 01/06. https://grana-app-sigma.vercel.app/app/dasn`,
    },
  ];

  const marco = marcos.find((m) => m.match);
  if (!marco) {
    // Hoje nao eh dia de nenhum marco — sai limpo.
    return { kind: 'dasn_reminders', candidates: 0, sent: 0, marco: null };
  }

  // Busca MEI com email + lembrete fiscal ligado + sem recibo do ano-base.
  const users = await prisma.user.findMany({
    where: {
      regime: 'MEI',
      email: { not: null },
      reminderDasEnabled: true,
      // Quem ja tem DasnRecibo do ano-base nao recebe.
      NOT: {
        dasnRecibos: { some: { year: yearBase } },
      },
    },
    select: { id: true, email: true, name: true },
  });

  const ref = String(yearBase);
  let sent = 0;
  for (const u of users) {
    if (await alreadySent(u.id, marco.kind, ref)) continue;
    const r = await sendGenericEmail({
      to: u.email,
      subject: marco.subject(),
      html: marco.body(u.name),
      text: marco.text(),
    });
    if (r.sent) {
      await markSent(u.id, marco.kind, ref);
      sent++;
    }
  }

  return {
    kind: 'dasn_reminders',
    candidates: users.length,
    sent,
    marco: marco.kind,
  };
}
