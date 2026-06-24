/**
 * Smoke test do programa de indicacao.
 *
 * Cria 2 usuarios sinteticos (indicador + indicada), roda o fluxo todo
 * (gerar codigo, resolver lookup, reportar conversao 2x pra checar
 * idempotencia, conferir bonus em ambos) e apaga no final.
 *
 * Roda com:
 *   DATABASE_URL=... DIRECT_URL=... npx tsx scripts/smoke-referral.ts
 */
// Carrega .env do diretorio atual. As vars do banco do Vercel sao marcadas
// como Sensitive (criptografadas), entao "vercel env pull" nao traz os valores.
// Pra rodar localmente, copie DATABASE_URL e DIRECT_URL do painel do Vercel
// (Settings > Environment Variables, clique no olho) pro .env local antes.
import 'dotenv/config';

import { prisma } from '@/lib/db';
import {
  ensureReferralCode,
  lookupReferrer,
  reportarConversaoIndicacao,
  getResumoIndicacoes,
  REFERRAL_BONUS_DAYS,
} from '@/lib/referral';

const PREFIX = 'smoketest-referral-';

async function main() {
  console.log('--- smoke test: programa de indicacao ---');

  // 1. Cria indicador
  const indicador = await prisma.user.create({
    data: {
      email: `${PREFIX}${Date.now()}-A@example.com`,
      name: 'Indicador Smoke',
      plan: 'free',
    },
  });
  console.log('[ok] criou indicador', indicador.id);

  // 2. Gera codigo
  const code = await ensureReferralCode(indicador.id);
  console.log('[ok] gerou codigo', code, '(len=' + code.length + ')');
  if (code.length !== 8) throw new Error('codigo deveria ter 8 chars');

  // 2b. Idempotencia: chama de novo, deve retornar o mesmo
  const code2 = await ensureReferralCode(indicador.id);
  if (code !== code2) throw new Error('ensureReferralCode nao eh idempotente');
  console.log('[ok] ensureReferralCode idempotente');

  // 3. Lookup
  const dono = await lookupReferrer(code);
  if (dono !== indicador.id) throw new Error('lookupReferrer nao bateu o id');
  console.log('[ok] lookupReferrer resolveu corretamente');

  // 3b. Lookup com self deve retornar null
  const self = await lookupReferrer(code, indicador.id);
  if (self !== null) throw new Error('auto-indicacao deveria retornar null');
  console.log('[ok] lookupReferrer bloqueia auto-indicacao');

  // 3c. Lookup de codigo invalido
  const invalid = await lookupReferrer('XXXXXXXX');
  if (invalid !== null) throw new Error('codigo invalido deveria retornar null');
  console.log('[ok] lookupReferrer retorna null pra invalido');

  // 4. Cria indicada com referredById preenchido
  const indicada = await prisma.user.create({
    data: {
      email: `${PREFIX}${Date.now()}-B@example.com`,
      name: 'Indicada Smoke',
      plan: 'free',
      referredById: indicador.id,
      referralUtmMedium: 'whatsapp',
    },
  });
  console.log('[ok] criou indicada', indicada.id);

  // 5. Snapshot ANTES da conversao
  const antesIndicador = await prisma.user.findUnique({
    where: { id: indicador.id },
    select: { trialEndsAt: true, planUntil: true, plan: true },
  });
  const antesIndicada = await prisma.user.findUnique({
    where: { id: indicada.id },
    select: { trialEndsAt: true, planUntil: true, plan: true, referralRewardedAt: true },
  });

  // 6. Reporta conversao
  const r1 = await reportarConversaoIndicacao(indicada.id);
  if (!r1.pago) throw new Error('primeira conversao deveria ter pago');
  if (r1.indicadorId !== indicador.id) throw new Error('indicadorId errado');
  console.log('[ok] reportarConversaoIndicacao pagou ambos');

  // 7. Conferir bonus
  const depoisIndicador = await prisma.user.findUnique({
    where: { id: indicador.id },
    select: { trialEndsAt: true, planUntil: true },
  });
  const depoisIndicada = await prisma.user.findUnique({
    where: { id: indicada.id },
    select: { trialEndsAt: true, planUntil: true, referralRewardedAt: true },
  });

  const trialIndicadorAntes = antesIndicador?.trialEndsAt?.getTime() ?? 0;
  const trialIndicadorDepois = depoisIndicador?.trialEndsAt?.getTime() ?? 0;
  const ganhoIndicadorMs = trialIndicadorDepois - Math.max(trialIndicadorAntes, Date.now() - 60_000);
  const esperadoMs = REFERRAL_BONUS_DAYS * 86_400_000;
  if (Math.abs(ganhoIndicadorMs - esperadoMs) > 5 * 60_000) {
    throw new Error(
      `indicador nao ganhou ${REFERRAL_BONUS_DAYS} dias (ganhou ${(ganhoIndicadorMs / 86_400_000).toFixed(2)})`,
    );
  }
  console.log('[ok] indicador ganhou', REFERRAL_BONUS_DAYS, 'dias de Pro');

  if (!depoisIndicada?.referralRewardedAt) {
    throw new Error('referralRewardedAt nao foi marcado na indicada');
  }
  console.log('[ok] indicada marcada com referralRewardedAt');

  // 8. Idempotencia: chama de novo, NAO deve pagar
  const r2 = await reportarConversaoIndicacao(indicada.id);
  if (r2.pago) throw new Error('segunda chamada nao deveria pagar (idempotencia)');
  console.log('[ok] reportarConversaoIndicacao idempotente (nao paga 2x)');

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
  console.log('[ok] getResumoIndicacoes ->', {
    code: resumo.code,
    cliques: resumo.totalCliques,
    indicados: resumo.totalIndicados,
    recompensados: resumo.totalRecompensados,
    diasBonus: resumo.diasBonusGanhos,
  });

  // 10. Cleanup
  await prisma.user.delete({ where: { id: indicada.id } });
  await prisma.user.delete({ where: { id: indicador.id } });
  console.log('[ok] cleanup completo');

  // Confirma que nao deixou lixo
  const sobra = await prisma.user.count({
    where: { email: { startsWith: PREFIX } },
  });
  if (sobra > 0) {
    console.warn(`[aviso] ${sobra} usuario(s) de teste ainda no banco`);
  }

  console.log('\n✅ todos os checks passaram');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('\n❌ falhou:', e?.message ?? e);
    // tentativa de cleanup mesmo em erro
    try {
      await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
      console.log('[cleanup] limpou usuarios de teste apos falha');
    } catch {}
    await prisma.$disconnect();
    process.exit(1);
  });
