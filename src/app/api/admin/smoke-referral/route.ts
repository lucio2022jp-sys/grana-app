/**
 * Endpoint ADMIN-ONLY pra rodar smoke test do programa de indicacao
 * direto contra o banco de producao. Cria 2 usuarios sinteticos,
 * roda o fluxo todo e apaga ambos no final (mesmo se der erro no meio).
 *
 * Esse endpoint EH TEMPORARIO. Remover apos validar a feature.
 *
 * Uso:
 *   curl -X POST https://grana-app-sigma.vercel.app/api/admin/smoke-referral \
 *     -H "x-admin-password: SUA_SENHA"
 *
 * Autenticacao: header x-admin-password com valor exato de ADMIN_PASSWORD.
 * Comparacao timingSafeEqual pra evitar timing attack.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import {
  ensureReferralCode,
  lookupReferrer,
  reportarConversaoIndicacao,
  getResumoIndicacoes,
  REFERRAL_BONUS_DAYS,
} from '@/lib/referral';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREFIX = 'smoketest-referral-';

function checkPassword(provided: string | null): boolean {
  const senha = process.env.ADMIN_PASSWORD ?? '';
  if (!senha || !provided) return false;
  if (provided.length !== senha.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(senha));
  } catch {
    return false;
  }
}

type StepResult = { step: string; ok: boolean; detail?: any };

export async function POST(req: NextRequest) {
  const provided = req.headers.get('x-admin-password');
  if (!checkPassword(provided)) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const steps: StepResult[] = [];
  let indicadorId: string | null = null;
  let indicadaId: string | null = null;
  const log = (step: string, ok: boolean, detail?: any) => {
    steps.push({ step, ok, detail });
  };

  try {
    // 1. Cria indicador
    const indicador = await prisma.user.create({
      data: {
        email: `${PREFIX}${Date.now()}-A@example.com`,
        name: 'Indicador Smoke',
        plan: 'free',
      },
    });
    indicadorId = indicador.id;
    log('cria-indicador', true, { id: indicador.id });

    // 2. Gera codigo
    const code = await ensureReferralCode(indicador.id);
    if (code.length !== 8) throw new Error(`codigo deveria ter 8 chars, tem ${code.length}`);
    log('gerar-codigo', true, { code });

    // 2b. Idempotencia
    const code2 = await ensureReferralCode(indicador.id);
    if (code !== code2) throw new Error('ensureReferralCode nao eh idempotente');
    log('ensure-idempotente', true);

    // 3. lookupReferrer valido
    const dono = await lookupReferrer(code);
    if (dono !== indicador.id) throw new Error('lookupReferrer nao bateu');
    log('lookup-valido', true);

    // 3b. self -> null
    const self = await lookupReferrer(code, indicador.id);
    if (self !== null) throw new Error('auto-indicacao deveria retornar null');
    log('lookup-self-bloqueado', true);

    // 3c. invalido -> null
    const inv = await lookupReferrer('XXXXXXXX');
    if (inv !== null) throw new Error('codigo invalido deveria retornar null');
    log('lookup-invalido-bloqueado', true);

    // 4. Cria indicada com referredById
    const indicada = await prisma.user.create({
      data: {
        email: `${PREFIX}${Date.now()}-B@example.com`,
        name: 'Indicada Smoke',
        plan: 'free',
        referredById: indicador.id,
        referralUtmMedium: 'whatsapp',
      },
    });
    indicadaId = indicada.id;
    log('cria-indicada', true, { id: indicada.id, referredById: indicador.id });

    // 5. Snapshot ANTES
    const antesIndicador = await prisma.user.findUnique({
      where: { id: indicador.id },
      select: { trialEndsAt: true, planUntil: true, plan: true },
    });

    // 6. Reporta conversao
    const r1 = await reportarConversaoIndicacao(indicada.id);
    if (!r1.pago) throw new Error('primeira conversao deveria pagar');
    if (r1.indicadorId !== indicador.id) throw new Error('indicadorId errado');
    log('reportar-conversao-1', true, r1);

    // 7. Conferir bonus em ambos
    const depoisIndicador = await prisma.user.findUnique({
      where: { id: indicador.id },
      select: { trialEndsAt: true, planUntil: true },
    });
    const depoisIndicada = await prisma.user.findUnique({
      where: { id: indicada.id },
      select: { trialEndsAt: true, planUntil: true, referralRewardedAt: true },
    });

    const trialAntes = antesIndicador?.trialEndsAt?.getTime() ?? 0;
    const trialDepois = depoisIndicador?.trialEndsAt?.getTime() ?? 0;
    const baseEsperada = Math.max(trialAntes, Date.now() - 60_000);
    const ganho = trialDepois - baseEsperada;
    const esperado = REFERRAL_BONUS_DAYS * 86_400_000;
    if (Math.abs(ganho - esperado) > 5 * 60_000) {
      throw new Error(
        `indicador nao ganhou ${REFERRAL_BONUS_DAYS} dias (ganhou ${(ganho / 86_400_000).toFixed(2)})`,
      );
    }
    log('indicador-ganhou-30d', true, {
      diasGanhos: +(ganho / 86_400_000).toFixed(2),
    });

    if (!depoisIndicada?.referralRewardedAt) {
      throw new Error('referralRewardedAt nao foi marcado');
    }
    log('indicada-marcada-rewarded', true, {
      referralRewardedAt: depoisIndicada.referralRewardedAt,
    });

    // 8. Idempotencia da conversao
    const r2 = await reportarConversaoIndicacao(indicada.id);
    if (r2.pago) throw new Error('segunda chamada nao deveria pagar');
    log('reportar-conversao-idempotente', true);

    // 9. Resumo
    const resumo = await getResumoIndicacoes(indicador.id);
    if (resumo.totalIndicados !== 1) throw new Error('totalIndicados errado');
    if (resumo.totalRecompensados !== 1) throw new Error('totalRecompensados errado');
    if (resumo.diasBonusGanhos !== REFERRAL_BONUS_DAYS) {
      throw new Error('diasBonusGanhos errado');
    }
    if (!resumo.shortLink.includes(`/r/${code}`)) {
      throw new Error('shortLink nao tem o codigo');
    }
    log('get-resumo', true, {
      indicados: resumo.totalIndicados,
      recompensados: resumo.totalRecompensados,
      diasBonus: resumo.diasBonusGanhos,
      shortLink: resumo.shortLink,
    });

    // 10. Cleanup
    await prisma.user.delete({ where: { id: indicada.id } });
    indicadaId = null;
    await prisma.user.delete({ where: { id: indicador.id } });
    indicadorId = null;
    log('cleanup', true);

    const sobra = await prisma.user.count({
      where: { email: { startsWith: PREFIX } },
    });
    if (sobra > 0) log('aviso-sobra', false, { count: sobra });

    return NextResponse.json({
      ok: true,
      passos: steps.length,
      todosOk: steps.every((s) => s.ok),
      steps,
    });
  } catch (e: any) {
    // Cleanup best-effort
    try {
      if (indicadaId) await prisma.user.delete({ where: { id: indicadaId } });
      if (indicadorId) await prisma.user.delete({ where: { id: indicadorId } });
      // Garantia: apaga qualquer sobra com prefixo
      await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
      log('cleanup-pos-erro', true);
    } catch (cleanupErr: any) {
      log('cleanup-pos-erro', false, { error: cleanupErr?.message });
    }

    return NextResponse.json(
      {
        ok: false,
        erro: e?.message ?? String(e),
        steps,
      },
      { status: 500 },
    );
  }
}
