/**
 * Backfill de contraparteDoc nas Transactions existentes.
 *
 * Reaplica o extrator de CPF/CNPJ (extrairDocumento do parser) sobre o que
 * tiver em description + contraparte. So escreve quando o campo esta vazio
 * e o extrator encontrou algum doc valido.
 *
 * Rodar: npx tsx scripts/backfill-contraparte-doc.ts
 *        npx tsx scripts/backfill-contraparte-doc.ts --dry  (so conta)
 */

import { PrismaClient } from '@prisma/client';
import { extrairDocumento } from '../src/lib/pdf-parser';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry');
const BATCH = 500;

async function main() {
  let cursor: string | undefined;
  let scanned = 0;
  let updated = 0;
  let alreadyHad = 0;

  for (;;) {
    const rows = await prisma.transaction.findMany({
      where: { contraparteDoc: null },
      select: { id: true, description: true, contraparte: true },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (rows.length === 0) break;

    for (const r of rows) {
      scanned++;
      const text = `${r.description ?? ''} ${r.contraparte ?? ''}`.trim();
      const doc = extrairDocumento(text);
      if (!doc) continue;

      if (DRY) {
        updated++;
        continue;
      }

      await prisma.transaction.update({
        where: { id: r.id },
        data: { contraparteDoc: doc },
      });
      updated++;
    }

    cursor = rows[rows.length - 1].id;
    if (rows.length < BATCH) break;
  }

  // Conta quantos ja tinham (so pra o relatorio final)
  alreadyHad = await prisma.transaction.count({ where: { NOT: { contraparteDoc: null } } });

  console.log(`escaneadas: ${scanned}`);
  console.log(`com doc encontrado${DRY ? ' (dry)' : ' (atualizadas)'}: ${updated}`);
  console.log(`total ja com contraparteDoc no banco: ${alreadyHad}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
