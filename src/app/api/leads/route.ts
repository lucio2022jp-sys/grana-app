/**
 * Captura de lead pre-signup. A pessoa entra na landing, deixa email
 * ou WhatsApp pra "ser avisada quando lancar" / "garantir vaga Founder".
 *
 * Estrategia anti-duplicacao: se email OU whatsapp ja existe, ATUALIZA
 * o registro existente (merge de campos), em vez de criar lead novo.
 * Assim a pessoa pode preencher 2x sem virar lead duplo.
 *
 * POST /api/leads
 * Body: { email?, whatsapp?, profissao?, source?, utm?, notes? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function normalizeWhatsapp(raw: string): string {
  // Mantem so digitos. Pessoa pode digitar (47) 99999-9999, +55 47..., etc.
  return raw.replace(/\D/g, '');
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
  const whatsappRaw = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : null;
  const whatsapp = whatsappRaw ? normalizeWhatsapp(whatsappRaw) : null;
  const profissao = typeof body.profissao === 'string' ? body.profissao.trim() : null;
  const source = typeof body.source === 'string' ? body.source.trim().slice(0, 80) : null;
  const utm = typeof body.utm === 'string' ? body.utm.slice(0, 500) : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : null;

  // Tem que ter pelo menos um canal de contato
  if (!email && !whatsapp) {
    return NextResponse.json(
      { error: 'Informe email ou WhatsApp' },
      { status: 400 },
    );
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Email invalido' }, { status: 400 });
  }

  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) {
    return NextResponse.json({ error: 'WhatsApp invalido' }, { status: 400 });
  }

  try {
    // Procura lead existente pelo email ou whatsapp
    const existing = await prisma.lead.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(whatsapp ? [{ whatsapp }] : []),
        ],
      },
    });

    if (existing) {
      // Merge dos campos (preserva o que ja tinha se nao foi enviado dessa vez)
      const updated = await prisma.lead.update({
        where: { id: existing.id },
        data: {
          email: email ?? existing.email,
          whatsapp: whatsapp ?? existing.whatsapp,
          profissao: profissao ?? existing.profissao,
          source: source ?? existing.source,
          utm: utm ?? existing.utm,
          notes: notes ?? existing.notes,
        },
      });
      return NextResponse.json({ ok: true, id: updated.id, updated: true });
    }

    const lead = await prisma.lead.create({
      data: { email, whatsapp, profissao, source, utm, notes },
    });

    return NextResponse.json({ ok: true, id: lead.id, updated: false });
  } catch (e: any) {
    console.error('[leads] erro:', e);
    return NextResponse.json(
      { error: 'Falha ao salvar lead' },
      { status: 500 },
    );
  }
}
