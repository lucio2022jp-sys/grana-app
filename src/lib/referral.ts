/**
 * Programa de indicacao member-get-member.
 *
 * Regras:
 *  - Cada User tem um referralCode unico e curto (8 chars, alfanumerico
 *    sem caracteres ambiguos: 0/O, 1/I/l). Gerado lazy na primeira
 *    visita a /app/indique.
 *  - Quem se cadastra via /signup?ref=CODIGO ganha referredById preenchido
 *    apontando pro dono do codigo.
 *  - Quando a indicada paga a primeira fatura (webhook Stripe), ambos
 *    ganham 30 dias de Pro somados a trialEndsAt/planUntil.
 *  - referralRewardedAt na indicada bloqueia double-reward.
 */
import { prisma } from '@/lib/db';

export const REFERRAL_BONUS_DAYS = 30;

// Alfabeto sem 0/O, 1/I/l pra reduzir confusao quando o usuario digita.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TAMANHO_CODE = 8;

function gerarCodigo(): string {
  let out = '';
  for (let i = 0; i < TAMANHO_CODE; i++) {
    out += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return out;
}

/**
 * Pega o codigo do usuario ou cria um se ainda nao tem. Lida com colisao
 * (improvavel, ~31^8 = 8.5e11 possibilidades) tentando ate 5 vezes.
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (u?.referralCode) return u.referralCode;

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const candidato = gerarCodigo();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: candidato },
        select: { referralCode: true },
      });
      return updated.referralCode!;
    } catch (e: unknown) {
      // P2002 = unique constraint. Tenta de novo.
      const err = e as { code?: string };
      if (err?.code !== 'P2002') throw e;
    }
  }
  throw new Error('Nao consegui gerar codigo de indicacao unico');
}

/**
 * Resolve um codigo de indicacao pro userId do dono. Retorna null se
 * codigo nao existe ou eh do proprio usuario (auto-indicacao).
 */
export async function lookupReferrer(
  code: string,
  selfUserId?: string,
): Promise<string | null> {
  if (!code) return null;
  const normalizado = code.trim().toUpperCase();
  if (normalizado.length !== TAMANHO_CODE) return null;
  const dono = await prisma.user.findUnique({
    where: { referralCode: normalizado },
    select: { id: true },
  });
  if (!dono) return null;
  if (selfUserId && dono.id === selfUserId) return null;
  return dono.id;
}

/**
 * Adiciona N dias a trialEndsAt ou planUntil do usuario. Estrategia:
 *  - Se ja tem planUntil futuro (pagante ativo), estende ele.
 *  - Senao, estende trialEndsAt (cria se nao tem).
 *
 * Sempre soma a partir do MAIOR entre "agora" e o valor atual, pra que
 * bonus nao seja desperdicado se a data ja passou.
 */
async function adicionarDiasPro(userId: string, dias: number): Promise<void> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { trialEndsAt: true, planUntil: true, plan: true },
  });
  if (!u) return;

  const agora = Date.now();
  const ms = dias * 86_400_000;

  if (u.plan === 'pro' && u.planUntil && u.planUntil.getTime() > agora) {
    const base = u.planUntil.getTime();
    await prisma.user.update({
      where: { id: userId },
      data: { planUntil: new Date(base + ms) },
    });
    return;
  }

  const baseTrial = u.trialEndsAt && u.trialEndsAt.getTime() > agora
    ? u.trialEndsAt.getTime()
    : agora;
  await prisma.user.update({
    where: { id: userId },
    data: { trialEndsAt: new Date(baseTrial + ms) },
  });
}

/**
 * Dispara a recompensa quando uma indicada paga a primeira fatura.
 * Idempotente: se referralRewardedAt ja existe, nao paga de novo.
 *
 * Chamar dentro do webhook do Stripe quando subscription vira "active"
 * pela primeira vez naquela conta.
 */
export async function reportarConversaoIndicacao(
  indicadaUserId: string,
): Promise<{ pago: boolean; indicadorId?: string }> {
  const indicada = await prisma.user.findUnique({
    where: { id: indicadaUserId },
    select: { referredById: true, referralRewardedAt: true },
  });
  if (!indicada || !indicada.referredById) return { pago: false };
  if (indicada.referralRewardedAt) return { pago: false };

  await adicionarDiasPro(indicadaUserId, REFERRAL_BONUS_DAYS);
  await adicionarDiasPro(indicada.referredById, REFERRAL_BONUS_DAYS);

  await prisma.user.update({
    where: { id: indicadaUserId },
    data: { referralRewardedAt: new Date() },
  });

  return { pago: true, indicadorId: indicada.referredById };
}

/**
 * Resumo pra pagina /app/indique: contadores e lista das ultimas indicadas.
 */
export async function getResumoIndicacoes(userId: string): Promise<{
  code: string;
  link: string;
  shortLink: string;
  totalIndicados: number;
  totalRecompensados: number;
  diasBonusGanhos: number;
  totalCliques: number;
  recentes: Array<{ nome: string | null; criadoEm: Date; recompensado: boolean }>;
}> {
  const code = await ensureReferralCode(userId);
  const [indicados, dono] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: userId },
      select: { name: true, createdAt: true, referralRewardedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { referralClickCount: true },
    }),
  ]);

  const totalRecompensados = indicados.filter((i) => i.referralRewardedAt).length;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://grana.app';
  const base = baseUrl.replace(/\/$/, '');
  // Link "oficial" (com UTM) pra quando a pessoa cola em copy direto.
  const link = `${base}/signup?ref=${code}&utm_source=referral&utm_medium=copy&utm_campaign=member_get_member`;
  // Link curto pra compartilhar (vai pro /r/CODE que conta clique + redireciona).
  const shortLink = `${base}/r/${code}`;

  return {
    code,
    link,
    shortLink,
    totalIndicados: indicados.length,
    totalRecompensados,
    diasBonusGanhos: totalRecompensados * REFERRAL_BONUS_DAYS,
    totalCliques: dono?.referralClickCount ?? 0,
    recentes: indicados.map((i) => ({
      nome: i.name,
      criadoEm: i.createdAt,
      recompensado: !!i.referralRewardedAt,
    })),
  };
}
