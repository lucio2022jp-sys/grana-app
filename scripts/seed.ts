/**
 * Script de seed - popula o banco com transacoes de exemplo
 * Execute com: npx tsx scripts/seed.ts
 *
 * Util pra testar o app sem precisar de extrato real.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpando banco de demo...');
  await prisma.transaction.deleteMany({ where: { user: { email: 'demo@grana.app' } } });
  await prisma.user.deleteMany({ where: { email: 'demo@grana.app' } });

  console.log('Criando user demo...');
  const user = await prisma.user.create({
    data: {
      email: 'demo@grana.app',
      name: 'Maria Demo',
      profissao: 'manicure',
    },
  });
  console.log('User demo criado:', user.id);

  // Gera transacoes do mes atual
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const transacoes = [
    // Receitas (clientes)
    { dia: 2, amount: 80, contraparte: 'Maria Silva', desc: 'Pix recebido' },
    { dia: 3, amount: 120, contraparte: 'Ana Souza', desc: 'Pix recebido' },
    { dia: 5, amount: 80, contraparte: 'Maria Silva', desc: 'Pix recebido' },
    { dia: 7, amount: 150, contraparte: 'Juliana Costa', desc: 'Pix recebido' },
    { dia: 8, amount: 80, contraparte: 'Patricia Lima', desc: 'Pix recebido' },
    { dia: 10, amount: 200, contraparte: 'Ana Souza', desc: 'Pix recebido' },
    { dia: 12, amount: 80, contraparte: 'Carla Mendes', desc: 'Pix recebido' },
    { dia: 14, amount: 120, contraparte: 'Maria Silva', desc: 'Pix recebido' },
    { dia: 15, amount: 100, contraparte: 'Patricia Lima', desc: 'Pix recebido' },
    { dia: 17, amount: 150, contraparte: 'Juliana Costa', desc: 'Pix recebido' },
    { dia: 19, amount: 80, contraparte: 'Carla Mendes', desc: 'Pix recebido' },
    { dia: 21, amount: 200, contraparte: 'Maria Silva', desc: 'Pix recebido' },
    { dia: 23, amount: 120, contraparte: 'Ana Souza', desc: 'Pix recebido' },
    { dia: 25, amount: 80, contraparte: 'Patricia Lima', desc: 'Pix recebido' },
  ];

  for (const t of transacoes) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date(y, m, t.dia, 14, 0),
        amount: t.amount,
        description: t.desc,
        contraparte: t.contraparte,
        type: 'receita',
        category: 'cliente',
        source: 'manual',
        userConfirmed: true,
      },
    });
  }

  // Despesas trabalho
  const despesasTrabalho = [
    { dia: 4, amount: -300, contraparte: 'Beauty Color', desc: 'Esmaltes', cat: 'produto' },
    { dia: 11, amount: -150, contraparte: 'Distribuidora ABC', desc: 'Algodao e acetona', cat: 'produto' },
    { dia: 18, amount: -89, contraparte: 'Vivo', desc: 'Internet', cat: 'servicos' },
    { dia: 22, amount: -400, contraparte: 'Salao Tropical', desc: 'Aluguel cadeira', cat: 'aluguel' },
    { dia: 24, amount: -50, contraparte: 'Instagram Ads', desc: 'Impulsionamento', cat: 'marketing' },
  ];

  for (const t of despesasTrabalho) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date(y, m, t.dia, 10, 0),
        amount: t.amount,
        description: t.desc,
        contraparte: t.contraparte,
        type: 'despesa',
        category: t.cat,
        isDeductible: true,
        source: 'manual',
        userConfirmed: true,
      },
    });
  }

  // Pessoais
  const pessoais = [
    { dia: 1, amount: -350, contraparte: 'Mercado Pao', desc: 'Compra mes', cat: 'alimentacao' },
    { dia: 6, amount: -45, contraparte: 'iFood', desc: 'Almoco', cat: 'alimentacao' },
    { dia: 13, amount: -120, contraparte: 'Drogaria Sao Paulo', desc: 'Remedios', cat: 'saude' },
    { dia: 20, amount: -200, contraparte: 'Enel', desc: 'Conta de luz', cat: 'casa' },
  ];

  for (const t of pessoais) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date(y, m, t.dia, 16, 0),
        amount: t.amount,
        description: t.desc,
        contraparte: t.contraparte,
        type: 'pessoal',
        category: t.cat,
        isPersonal: true,
        source: 'manual',
        userConfirmed: true,
      },
    });
  }

  // Receitas de meses anteriores pra simular limite MEI
  for (let monthOffset = 1; monthOffset <= 10; monthOffset++) {
    const oldDate = new Date(y, m - monthOffset, 15, 12);
    if (oldDate.getFullYear() === y) {
      // Soma cerca de 4500 por mes
      await prisma.transaction.create({
        data: {
          userId: user.id,
          date: oldDate,
          amount: 4500,
          description: 'Receitas mes ' + (m - monthOffset + 1),
          contraparte: 'Varios clientes',
          type: 'receita',
          category: 'cliente',
          source: 'manual',
          userConfirmed: true,
        },
      });
    }
  }

  const total = await prisma.transaction.count({ where: { userId: user.id } });
  console.log(`Total de transacoes inseridas: ${total}`);

  console.log('\nPra usar como demo:');
  console.log(`1. No browser, abra http://localhost:3000`);
  console.log(`2. No DevTools > Application > Cookies, defina: grana_uid = ${user.id}`);
  console.log(`3. Refresh - voce ja entra como Maria Demo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
