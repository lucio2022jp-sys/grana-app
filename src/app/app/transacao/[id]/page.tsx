import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import EditTxClient from './edit-client';

export default async function TransacaoPage({ params }: { params: { id: string } }) {
  const uid = cookies().get('grana_uid')?.value;
  if (!uid) notFound();

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!tx || tx.userId !== uid) notFound();

  return (
    <EditTxClient
      tx={{
        id: tx.id,
        date: tx.date.toISOString(),
        amount: tx.amount,
        description: tx.description,
        contraparte: tx.contraparte,
        type: tx.type,
        category: tx.category,
        isDeductible: tx.isDeductible,
        isPersonal: tx.isPersonal,
        userConfirmed: tx.userConfirmed,
        hasAttachment: Boolean(tx.attachmentUrl),
        notaNumero: tx.notaNumero ?? null,
        natureza: (tx.natureza as 'produto' | 'servico' | null) ?? null,
      }}
    />
  );
}
