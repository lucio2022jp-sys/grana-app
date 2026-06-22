import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseAnyExtract } from '@/lib/extract-parser';
import { classifyTransactions } from '@/lib/classifier';
import { getCookieOptions, getUserCookieName } from '@/lib/session';
import { hashTx, dedupTransactions } from '@/lib/dedup';
import { marcarRecorrentes } from '@/lib/recurring';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Endpoint que recebe arquivo compartilhado via Web Share Target API.
 * Chamado quando o usuario toca em "Compartilhar PDF" no app do banco
 * e escolhe o Grana na bandeja de compartilhamento.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      // Se nao veio arquivo, redireciona pra tela de upload manual
      return NextResponse.redirect(new URL('/onboarding/upload?from=share', req.url));
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.redirect(
        new URL('/share/erro?msg=arquivo_grande', req.url),
      );
    }

    // Pega ou cria user
    const cookieName = getUserCookieName();
    let uid = req.cookies.get(cookieName)?.value;
    let user = uid ? await prisma.user.findUnique({ where: { id: uid } }) : null;
    if (!user) {
      user = await prisma.user.create({ data: {} });
      uid = user.id;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await prisma.upload.create({
      data: {
        userId: user.id,
        fileName: file.name || 'compartilhado.pdf',
        fileSize: file.size,
        status: 'processing',
      },
    });

    let parseResult;
    try {
      parseResult = await parseAnyExtract(buffer, file.name || 'compartilhado');
    } catch (err: any) {
      await prisma.upload.update({
        where: { id: upload.id },
        data: { status: 'error', errorMsg: err.message ?? 'Erro ao ler arquivo' },
      });
      return NextResponse.redirect(
        new URL('/share/erro?msg=parse', req.url),
      );
    }

    // Classifica com aprendizado
    const classifications = await classifyTransactions(
      parseResult.transactions,
      user.profissao ?? undefined,
      user.id,
    );

    // Deduplicacao: filtra transacoes que ja existem
    const existingHashes = await prisma.transaction
      .findMany({
        where: { userId: user.id },
        select: { date: true, amount: true, contraparte: true, description: true },
      })
      .then((txs) => new Set(txs.map((t) => hashTx({
        date: t.date,
        amount: t.amount,
        contraparte: t.contraparte,
        description: t.description,
      }))));

    const novas = parseResult.transactions
      .map((tx, i) => ({ tx, cls: classifications[i] }))
      .filter(({ tx }) => !existingHashes.has(hashTx(tx)));

    const duplicadas = parseResult.transactions.length - novas.length;

    if (novas.length > 0) {
      await prisma.$transaction(
        novas.map(({ tx, cls }) => {
          const autoConfirmed = cls.confidence >= 0.9;
          return prisma.transaction.create({
            data: {
              userId: user!.id,
              uploadId: upload.id,
              date: tx.date,
              amount: tx.amount,
              description: tx.description,
              contraparte: tx.contraparte,
              type: cls.type,
              category: cls.category,
              isDeductible: cls.isDeductible,
              isPersonal: cls.isPersonal,
              source: `${parseResult.format}_share`,
              aiSuggested: true,
              userConfirmed: autoConfirmed,
              notes: cls.reasoning,
              imported: true,
            },
          });
        }),
      );
    }

    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: 'done',
        bankDetected: parseResult.bank,
        rawText: parseResult.rawTextSample,
        txCount: novas.length,
      },
    });

    // Detecta recorrencias (best-effort)
    try {
      await marcarRecorrentes(user.id);
    } catch (err) {
      console.error('Erro ao detectar recorrencias:', err);
    }

    // Redireciona pra tela de processando que mostra o resultado
    const url = new URL('/onboarding/processando', req.url);
    url.searchParams.set('upload', upload.id);
    url.searchParams.set('novas', String(novas.length));
    url.searchParams.set('duplicadas', String(duplicadas));

    const response = NextResponse.redirect(url);
    response.cookies.set(cookieName, user.id, getCookieOptions());
    return response;
  } catch (err: any) {
    console.error('Erro no share:', err);
    return NextResponse.redirect(new URL('/share/erro?msg=geral', req.url));
  }
}

// GET responde com a pagina de erro se chamado sem POST
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/onboarding/upload', req.url));
}
