import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cria historico de imports (Upload) para os usuarios demo e linka algumas
 * transactions existentes a esses uploads, pra pagina /app/imports nao ficar
 * vazia. Idempotente: pula users que ja tem upload.
 */
async function main() {
  const demos = await prisma.user.findMany({
    where: { email: { in: ['bruna.demo@grana.app', 'carlos.demo@grana.app'] } },
    include: { _count: { select: { uploads: true, transactions: true } } },
  });

  if (demos.length === 0) {
    console.log('Nenhum user demo encontrado, rode seed-demo antes.');
    return;
  }

  const hoje = new Date();

  for (const user of demos) {
    if (user._count.uploads > 0) {
      console.log(`- ${user.email}: ja tem ${user._count.uploads} uploads, pulando`);
      continue;
    }

    // 3 imports historicos: 60 dias atras, 30 dias atras, 5 dias atras.
    // Distribui as transactions existentes entre eles por data.
    const txs = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
    });

    const isMei = user.email === 'bruna.demo@grana.app';
    const banco = isMei ? 'Nubank PJ' : 'Itau';
    const ext = isMei ? 'ofx' : 'pdf';

    const imports = [
      {
        diasAtras: 60,
        fileName: `extrato-${banco.toLowerCase().replace(/\s/g, '-')}-${monthLabel(60)}.${ext}`,
      },
      {
        diasAtras: 30,
        fileName: `extrato-${banco.toLowerCase().replace(/\s/g, '-')}-${monthLabel(30)}.${ext}`,
      },
      {
        diasAtras: 5,
        fileName: `extrato-${banco.toLowerCase().replace(/\s/g, '-')}-${monthLabel(5)}.${ext}`,
      },
    ];

    // Cria cada upload com createdAt ajustado pra data desejada
    const uploadsCriados = [] as { id: string; cutoff: Date }[];
    for (const imp of imports) {
      const data = daysAgo(imp.diasAtras);
      const upload = await prisma.upload.create({
        data: {
          userId: user.id,
          fileName: imp.fileName,
          fileSize: 30000 + Math.floor(Math.random() * 80000),
          bankDetected: banco,
          status: 'completed',
          txCount: 0, // atualizado depois
          createdAt: data,
          updatedAt: data,
        },
      });
      uploadsCriados.push({ id: upload.id, cutoff: data });
    }

    // Distribui txs: pra cada tx, pega o upload mais recente que veio antes da data da tx.
    // Assim transacao de 45 dias atras cai no upload de 60 dias atras.
    const buckets = new Map<string, number>();
    for (const tx of txs) {
      const candidato = [...uploadsCriados]
        .reverse()
        .find((u) => u.cutoff <= tx.date) ?? uploadsCriados[0];
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { uploadId: candidato.id, source: 'pdf' },
      });
      buckets.set(candidato.id, (buckets.get(candidato.id) ?? 0) + 1);
    }

    // Atualiza txCount de cada upload
    for (const u of uploadsCriados) {
      await prisma.upload.update({
        where: { id: u.id },
        data: { txCount: buckets.get(u.id) ?? 0 },
      });
    }

    console.log(
      `+ ${user.email}: ${uploadsCriados.length} uploads, distribuiu ${txs.length} txs`,
    );
  }

  console.log('OK');
}

function daysAgo(d: number): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  // Hora aleatoria pra parecer mais real
  dt.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 59), 0, 0);
  return dt;
}

function monthLabel(diasAtras: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - diasAtras);
  const meses = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ];
  return `${meses[dt.getMonth()]}-${dt.getFullYear()}`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
