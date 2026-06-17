import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/auth';
import { buildResetUrl, generateRawToken, hashToken, tokenExpiresAt } from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().trim().email('E-mail invalido.'),
});

const GENERIC_OK = {
  ok: true,
  message: 'Se essa conta existir, voce vai receber um e-mail com o link pra redefinir a senha em ate alguns minutos.',
};

// Rate limit in-memory por IP. Reseta em cold start (aceitavel pra MVP).
// Quando crescer, mover pra Upstash/Vercel KV.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const rateMap: Map<string, number[]> = new Map();

function tooManyForIp(ip: string): boolean {
  const now = Date.now();
  const arr = (rateMap.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) {
    rateMap.set(ip, arr);
    return true;
  }
  arr.push(now);
  rateMap.set(ip, arr);
  return false;
}

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  // @ts-ignore — req.ip existe no edge/Next runtime
  return (req as any).ip ?? 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const email = normalizeEmail(data.email);

    const ip = getIp(req);
    const userAgent = req.headers.get('user-agent') ?? null;

    // Rate limit ANTES de tocar no banco. Mesmo no rate limit, devolve generico.
    if (tooManyForIp(ip)) {
      return NextResponse.json(GENERIC_OK);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Nao revela se o e-mail existe. Tambem ignora contas sem senha (demo/anon).
    if (!user || !user.passwordHash) {
      return NextResponse.json(GENERIC_OK);
    }

    // Invalida tokens anteriores ainda validos desse user.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const raw = generateRawToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: tokenExpiresAt(),
        requestIp: ip,
        userAgent,
      },
    });

    await sendPasswordResetEmail(user.email, user.name, buildResetUrl(raw));

    return NextResponse.json(GENERIC_OK);
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json(
        { error: 'invalido', message: e.issues[0]?.message ?? 'Dados invalidos.' },
        { status: 400 },
      );
    }
    console.error('[POST /api/auth/forgot] erro:', e?.message);
    // Mesmo em erro inesperado, nao vazar detalhes pelo cliente.
    return NextResponse.json(GENERIC_OK);
  }
}
