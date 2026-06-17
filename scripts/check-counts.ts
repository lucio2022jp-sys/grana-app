import { prisma } from '../src/lib/db';

(async () => {
  const c = {
    user: await prisma.user.count(),
    transaction: await prisma.transaction.count(),
    upload: await prisma.upload.count(),
    dasPayment: await prisma.dASPayment.count(),
    contadorParceiro: await prisma.contadorParceiro.count(),
    indicacao: await prisma.indicacao.count(),
    avaliacao: await prisma.avaliacao.count(),
  };
  console.log('COUNTS:', JSON.stringify(c, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      profissao: true,
      regime: true,
      contadorNome: true,
      _count: { select: { transactions: true, uploads: true, dasPayments: true } },
    },
  });
  console.log('USERS:\n' + JSON.stringify(users, null, 2));

  const tx = await prisma.transaction.groupBy({ by: ['userId'], _count: true });
  console.log('TX BY USER:', tx);

  await prisma.$disconnect();
})();
