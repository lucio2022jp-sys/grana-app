import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';
import { ALLOWED_RECEIPT_MIMES, MAX_RECEIPT_BYTES } from '@/lib/storage';
import { TX_TYPES, type TxType } from '@/lib/tx-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Scan custa um call de IA. Limita pra evitar abuso.
const SCAN_LIMIT = 20;
const SCAN_WINDOW_MS = 60 * 60 * 1000; // 1 hora

const VISION_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * POST /api/notes/scan
 *
 * Recebe uma foto de nota fiscal/cupom (multipart/form-data, campo "file") e
 * usa Claude com vision pra extrair os campos relevantes pro app:
 *   - data, valor total, descricao, contraparte (estabelecimento)
 *   - tipo (despesa/receita) e categoria sugerida
 *   - flag isDeductible baseado na profissao do user
 *
 * Retorna JSON pra preview no client. Nao cria a transacao aqui — quem cria
 * eh o user via POST /api/transactions depois de revisar.
 */
export async function POST(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) {
    return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });
  }

  const rl = rateLimit(rateLimitKey(req, 'note-scan', uid), {
    limit: SCAN_LIMIT,
    refillMs: SCAN_WINDOW_MS,
  });
  if (!rl.ok) {
    const retrySec = Math.ceil(rl.retryAfterMs / 1000);
    return NextResponse.json(
      { error: `Muitos scans. Tente em ${Math.ceil(retrySec / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(retrySec) } },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'IA nao configurada. Peca ao admin pra setar ANTHROPIC_API_KEY.' },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Form invalido.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 });
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    const maxMb = Math.round(MAX_RECEIPT_BYTES / 1024 / 1024);
    return NextResponse.json(
      { error: `Arquivo muito grande. Maximo ${maxMb}MB.` },
      { status: 413 },
    );
  }

  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_RECEIPT_MIMES.includes(mime as (typeof ALLOWED_RECEIPT_MIMES)[number])) {
    return NextResponse.json(
      { error: 'Formato nao suportado. Use foto (JPG/PNG/WEBP).' },
      { status: 415 },
    );
  }
  // Vision so aceita JPG/PNG/WEBP. HEIC/PDF nao funciona direto.
  if (!VISION_MIMES.includes(mime as (typeof VISION_MIMES)[number])) {
    return NextResponse.json(
      { error: 'Pra ler nota usa JPG, PNG ou WEBP. HEIC/PDF nao funciona aqui.' },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');

  // Profissao do user ajuda o modelo a decidir se eh dedutivel.
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { profissao: true },
  });
  const profissao = user?.profissao ?? 'autonomo';

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `Voce extrai dados de notas fiscais, cupons e comprovantes brasileiros.

Retorne SEMPRE um unico JSON valido, sem comentarios, sem markdown, sem texto antes ou depois. Estrutura:

{
  "valor": number,           // total pago, em reais. ex: 89.90
  "data": "YYYY-MM-DD",      // data da compra (use a do cupom). Se nao achar, usa hoje.
  "descricao": string,       // descricao curta do que foi comprado, em portugues, max 80 chars
  "contraparte": string,     // nome do estabelecimento. ex: "Mercadinho do Zé"
  "type": one of [${TX_TYPES.map((t) => `"${t}"`).join(', ')}],
  "category": string,        // ex: "produto", "alimentacao", "transporte", "equipamento", "servicos", "marketing", "curso", "lazer", "casa", "saude", "familia"
  "isDeductible": boolean,   // true se eh despesa do trabalho dedutivel pra profissao "${profissao}"
  "isPersonal": boolean,     // true se eh gasto pessoal (nao do trabalho)
  "confidence": number,      // 0-1, quao seguro voce esta da extracao
  "reasoning": string        // 1 frase curta explicando a classificacao
}

Regras:
- Se for um cupom de mercado/restaurante e a profissao NAO usa esses itens no trabalho, marca isPersonal=true e isDeductible=false.
- Se for um cupom claramente do trabalho (ex: posto de combustivel pra motorista, esmalte pra manicure), marca type="despesa", isDeductible=true, isPersonal=false.
- Se nao conseguir ler a imagem ou nao for uma nota, retorne: {"error": "nao_eh_nota", "motivo": "..."}.

Profissao do usuario: ${profissao}. Use isso pra decidir dedutibilidade.`;

  let raw: string;
  try {
    const completion = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mime as 'image/jpeg' | 'image/png' | 'image/webp',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extrai os dados dessa nota e retorna o JSON.',
            },
          ],
        },
      ],
    });

    const text = completion.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
      .trim();
    raw = text;
  } catch (err: any) {
    console.error('[notes/scan] erro chamando Anthropic:', err?.message ?? err);
    return NextResponse.json(
      { error: 'Falha ao analisar a nota. Tente de novo.' },
      { status: 502 },
    );
  }

  // Modelo pode envelopar em ```json ... ``` mesmo pedindo pra nao envelopar.
  const cleaned = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn('[notes/scan] JSON invalido do modelo:', raw);
    return NextResponse.json(
      { error: 'Nao consegui ler a nota. Tira uma foto mais nitida ou cadastra manual.' },
      { status: 422 },
    );
  }

  if (parsed?.error === 'nao_eh_nota') {
    return NextResponse.json(
      { error: parsed.motivo || 'A imagem nao parece ser uma nota.' },
      { status: 422 },
    );
  }

  // Sanitiza: garante tipos e valores razoaveis.
  const valor = Number(parsed.valor);
  if (!isFinite(valor) || valor <= 0) {
    return NextResponse.json(
      { error: 'Nao consegui identificar o valor. Cadastra manual.' },
      { status: 422 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const data = typeof parsed.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.data)
    ? parsed.data
    : today;

  const type: TxType = TX_TYPES.includes(parsed.type) ? parsed.type : 'despesa';

  return NextResponse.json({
    extracted: {
      valor,
      data,
      descricao: String(parsed.descricao ?? '').slice(0, 200) || 'Compra',
      contraparte: String(parsed.contraparte ?? '').slice(0, 120),
      type,
      category: String(parsed.category ?? 'outros').slice(0, 40),
      isDeductible: Boolean(parsed.isDeductible),
      isPersonal: Boolean(parsed.isPersonal),
      confidence: Number(parsed.confidence) || 0.5,
      reasoning: String(parsed.reasoning ?? '').slice(0, 200),
    },
  });
}
