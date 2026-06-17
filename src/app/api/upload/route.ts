import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseAnyExtract } from '@/lib/extract-parser';
import { classifyTransactionsDetailed } from '@/lib/classifier';
import { getCookieOptions, getUserCookieName } from '@/lib/session';
import { hashTx } from '@/lib/dedup';
import { marcarRecorrentes } from '@/lib/recurring';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Upload e caro (parser + IA). Limita pra evitar abuso e custo descontrolado.
const UPLOAD_LIMIT = 10;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000; // 1 hora

export async function POST(req: NextRequest) {
  try {
    // Pega ou cria user via cookie ANTES do rate limit pra usar uid como chave.
    const cookieName = getUserCookieName();
    let uid = req.cookies.get(cookieName)?.value;
    let user = uid ? await prisma.user.findUnique({ where: { id: uid } }) : null;

    // Rate limit antes de fazer trabalho pesado. Se ainda nao tem user, usa IP.
    const rl = rateLimit(rateLimitKey(req, 'upload', user?.id), {
      limit: UPLOAD_LIMIT,
      refillMs: UPLOAD_WINDOW_MS,
    });
    if (!rl.ok) {
      const retrySec = Math.ceil(rl.retryAfterMs / 1000);
      return NextResponse.json(
        {
          error: `Muitos uploads em pouco tempo. Tente novamente em ${Math.ceil(retrySec / 60)} min.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retrySec),
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo nao enviado' }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (max 20MB)' }, { status: 400 });
    }

    if (!user) {
      user = await prisma.user.create({ data: {} });
      uid = user.id;
    }

    // Le o PDF
    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await prisma.upload.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileSize: file.size,
        status: 'processing',
      },
    });

    let parseResult;
    try {
      parseResult = await parseAnyExtract(buffer, file.name);
    } catch (err: any) {
      await prisma.upload.update({
        where: { id: upload.id },
        data: { status: 'error', errorMsg: err.message ?? 'Erro ao ler arquivo' },
      });
      return NextResponse.json(
        { error: err.message ?? 'Nao foi possivel ler o arquivo. Tente PDF, OFX ou CSV.' },
        { status: 400 },
      );
    }

    // Classifica transacoes (com aprendizado do historico do usuario)
    const { classifications, metrics } = await classifyTransactionsDetailed(
      parseResult.transactions,
      user.profissao ?? undefined,
      user.id,
    );

    // Deduplicacao: filtra transacoes que ja existem no banco do usuario
    const existentes = await prisma.transaction.findMany({
      where: { userId: user.id },
      select: { date: true, amount: true, contraparte: true, description: true },
    });
    const hashesExistentes = new Set(existentes.map((t) => hashTx(t)));

    const indicesNovos: number[] = [];
    parseResult.transactions.forEach((tx, i) => {
      if (!hashesExistentes.has(hashTx(tx))) {
        indicesNovos.push(i);
      }
    });
    const duplicadas = parseResult.transactions.length - indicesNovos.length;

    // Salva so as novas
    const created = indicesNovos.length > 0
      ? await prisma.$transaction(
          indicesNovos.map((i) => {
            const tx = parseResult.transactions[i];
            const cls = classifications[i];
            // Auto-confirma quando confianca alta (match exato com historico)
            const autoConfirmed = cls.confidence >= 0.9;
            return prisma.transaction.create({
              data: {
                userId: user!.id,
                uploadId: upload.id,
                date: tx.date,
                amount: tx.amount,
                description: tx.description,
                contraparte: tx.contraparte,
                contraparteDoc: tx.contraparteDoc,
                type: cls.type,
                category: cls.category,
                isDeductible: cls.isDeductible,
                isPersonal: cls.isPersonal,
                source: `${parseResult.format}_upload`,
                aiSuggested: true,
                userConfirmed: autoConfirmed,
                notes: cls.reasoning,
              },
            });
          }),
        )
      : [];

    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: 'done',
        bankDetected: parseResult.bank,
        rawText: parseResult.rawTextSample,
        txCount: created.length,
      },
    });

    // Telemetria do classificador (best-effort, nao bloqueia o upload se falhar)
    try {
      await prisma.classificationMetric.create({
        data: {
          userId: user.id,
          uploadId: upload.id,
          totalTxs: metrics.totalTxs,
          fromHistory: metrics.fromHistory,
          fromHeuristic: metrics.fromHeuristic,
          fromAI: metrics.fromAI,
          aiCallsCount: metrics.aiCallsCount,
          aiTxsCount: metrics.aiTxsCount,
        },
      });
    } catch (err) {
      console.error('Erro ao gravar telemetria do classificador:', err);
    }

    // Detecta e marca recorrencias depois de salvar (best-effort, nao bloqueia se falhar)
    let recurringCount = 0;
    try {
      recurringCount = await marcarRecorrentes(user.id);
    } catch (err) {
      console.error('Erro ao detectar recorrencias:', err);
    }

    const response = NextResponse.json({
      uploadId: upload.id,
      bank: parseResult.bank,
      txCount: created.length,
      duplicadas,
      recurringCount,
      total: parseResult.transactions.length,
      sample: created.slice(0, 5).map((t) => ({
        amount: t.amount,
        description: t.description,
        type: t.type,
        category: t.category,
      })),
    });

    // Garante cookie do user
    response.cookies.set(cookieName, user.id, getCookieOptions());
    response.headers.set('X-RateLimit-Limit', String(rl.limit));
    response.headers.set('X-RateLimit-Remaining', String(rl.remaining));

    return response;
  } catch (err: any) {
    console.error('Erro no upload:', err);
    return NextResponse.json(
      { error: err.message ?? 'Erro inesperado' },
      { status: 500 },
    );
  }
}
