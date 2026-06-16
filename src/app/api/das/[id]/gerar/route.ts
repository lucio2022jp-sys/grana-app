import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';
import { gerarDAS } from '@/lib/das-gen';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = req.cookies.get(getUserCookieName())?.value;
  if (!uid) {
    return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });
  }

  const payment = await prisma.dASPayment.findUnique({ where: { id: params.id } });
  if (!payment || payment.userId !== uid) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  }

  if (payment.paidAt) {
    return NextResponse.json({ error: 'DAS ja foi pago' }, { status: 400 });
  }

  const codigo = await gerarDAS({
    valor: payment.value,
    month: payment.month,
    year: payment.year,
    descricao: `DAS ${String(payment.month).padStart(2, '0')}/${payment.year}`,
  });

  // Gera o QR Code como Data URL (base64) pro frontend exibir como <img>
  let qrCodeDataUrl: string | null = null;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(codigo.qrCodeData, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: { dark: '#1f2937', light: '#ffffff' },
    });
  } catch (err) {
    console.error('Erro QR Code:', err);
  }

  return NextResponse.json({
    valor: payment.value,
    month: payment.month,
    year: payment.year,
    dueDate: payment.dueDate,
    pixCopiaCola: codigo.pixCopiaCola,
    qrCodeDataUrl,
    linhaDigitavel: codigo.linhaDigitavel,
    codigoBarras: codigo.codigoBarras,
    isDemo: codigo.isDemo,
    expiresAt: codigo.expiresAt,
  });
}
