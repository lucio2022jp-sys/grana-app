import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCookieOptions, getUserCookieName } from '@/lib/session';
import {
  calcularDASMensal,
  calcularVencimento,
  getDASStatus,
  calcularMultaAtraso,
} from '@/lib/das';
import { LIMITE_MEI, ANTECEDENCIA_ALERTA, URGENCIA_ALERTA } from '@/lib/simples';
import { z } from 'zod';

const createSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2050),
  value: z.number().optional(),
});

/**
 * Calcula receita do mes especifico (em reais).
 */
async function getReceitaMes(userId: string, year: number, month: number): Promise<number> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'receita',
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

/**
 * Calcula RBT12 (receita bruta dos ultimos 12 meses) ate uma data de referencia.
 */
async function getRBT12(userId: string, refYear: number, refMonth: number): Promise<number> {
  // Ultimos 12 meses ate o final do mes anterior ao mes de referencia
  const endRef = new Date(refYear, refMonth - 1, 1); // 1o dia do mes ref
  const startRef = new Date(refYear, refMonth - 13, 1); // 12 meses antes
  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'receita',
      date: { gte: startRef, lt: endRef },
    },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

/**
 * Receita acumulada do ano corrente (pra alerta MEI).
 */
async function getReceitaAno(userId: string, year: number): Promise<number> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'receita',
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

/**
 * Lista DAS do user. Retorna pelos ultimos 12 meses,
 * inserindo automaticamente os meses que ainda nao tem registro.
 */
export async function GET(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;

  if (!uid) {
    return NextResponse.json({ payments: [], current: null });
  }

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ payments: [], current: null });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const regime = user.regime ?? (user.meiAtividade ? 'mei' : 'mei');

  // Calcula valor do DAS pro mes corrente baseado no regime
  async function calcValorDoMes(year: number, month: number): Promise<{
    value: number;
    rbt12?: number;
    aliquota?: number;
  }> {
    if (regime === 'simples' && user!.simplesAnexo) {
      const receita = await getReceitaMes(uid!, year, month);
      const rbt12 = await getRBT12(uid!, year, month);
      const calc = calcularDASMensal({
        regime: 'simples',
        simplesAnexo: user!.simplesAnexo,
        receitaMes: receita,
        rbt12,
      });
      return {
        value: Math.max(0, calc.value),
        rbt12,
        aliquota: calc.aliquota,
      };
    }
    const calc = calcularDASMensal({
      regime: 'mei',
      meiAtividade: user!.meiAtividade,
    });
    return { value: calc.value };
  }

  // Pega registros existentes
  const existing = await prisma.dASPayment.findMany({
    where: { userId: uid },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 24,
  });

  // Garante que existe registro pro mes atual e meses anteriores recentes
  const ensureMonths: Array<{ month: number; year: number }> = [];
  for (let i = 0; i < 3; i++) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    ensureMonths.push({ month: m, year: y });
  }

  for (const { month, year } of ensureMonths) {
    const exists = existing.find((p) => p.month === month && p.year === year);
    if (!exists) {
      const calc = await calcValorDoMes(year, month);
      const dueDate = calcularVencimento(month, year);
      try {
        const created = await prisma.dASPayment.create({
          data: {
            userId: uid,
            month,
            year,
            value: calc.value,
            dueDate,
            regime,
            rbt12: calc.rbt12,
            aliquota: calc.aliquota,
          },
        });
        existing.push(created);
      } catch (e) {
        // Race condition
      }
    } else if (regime === 'simples' && !exists.paidAt) {
      // Pra Simples, recalcula sempre que nao foi pago (pode ter mudado receita)
      const calc = await calcValorDoMes(year, month);
      if (Math.abs(exists.value - calc.value) > 0.01) {
        const updated = await prisma.dASPayment.update({
          where: { id: exists.id },
          data: { value: calc.value, regime, rbt12: calc.rbt12, aliquota: calc.aliquota },
        });
        const idx = existing.findIndex((p) => p.id === exists.id);
        if (idx !== -1) existing[idx] = updated;
      }
    }
  }

  // Reordena
  existing.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const naoPagos = existing.filter((p) => !p.paidAt);
  let current = naoPagos[naoPagos.length - 1] ?? null;
  const proxVencer = naoPagos
    .filter((p) => getDASStatus(p.dueDate, null) !== 'em_dia')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  if (proxVencer) current = proxVencer;

  const payments = existing.map((p) => {
    const status = getDASStatus(p.dueDate, p.paidAt);
    const multa = !p.paidAt ? calcularMultaAtraso(p.value, p.dueDate) : 0;
    return {
      ...p,
      status,
      multa,
      total: p.value + multa,
    };
  });

  const currentEnriched = current
    ? {
        ...current,
        status: getDASStatus(current.dueDate, current.paidAt),
        multa: !current.paidAt ? calcularMultaAtraso(current.value, current.dueDate) : 0,
        total: current.value + (current.paidAt ? 0 : calcularMultaAtraso(current.value, current.dueDate)),
      }
    : null;

  // Alerta de limite MEI
  let alertaMEI = null;
  if (regime === 'mei') {
    const receitaAno = await getReceitaAno(uid, currentYear);
    const percent = receitaAno / LIMITE_MEI;
    if (percent >= URGENCIA_ALERTA) {
      alertaMEI = {
        nivel: 'urgente' as const,
        percent: Math.round(percent * 100),
        receita: receitaAno,
        limite: LIMITE_MEI,
        message: 'Voce esta perto de estourar o limite MEI',
      };
    } else if (percent >= ANTECEDENCIA_ALERTA) {
      alertaMEI = {
        nivel: 'atencao' as const,
        percent: Math.round(percent * 100),
        receita: receitaAno,
        limite: LIMITE_MEI,
        message: 'Atencao com o limite MEI',
      };
    }
  }

  // Receita do mes corrente (util pra Simples mostrar quanto vai pagar)
  const receitaMesCorrente = regime === 'simples'
    ? await getReceitaMes(uid, currentYear, currentMonth)
    : 0;

  return NextResponse.json({
    payments,
    current: currentEnriched,
    regime,
    atividade: user.meiAtividade,
    simplesAnexo: user.simplesAnexo,
    valorMensal: currentEnriched?.value ?? 0,
    alertaMEI,
    receitaMesCorrente,
  });
}

/**
 * Cria DAS manual (usado quando user quer adicionar mes especifico).
 */
export async function POST(req: NextRequest) {
  const body = createSchema.parse(await req.json());
  const cookieName = getUserCookieName();
  let uid = req.cookies.get(cookieName)?.value;

  let user = uid ? await prisma.user.findUnique({ where: { id: uid } }) : null;
  if (!user) {
    user = await prisma.user.create({ data: {} });
    uid = user.id;
  }

  const regime = user.regime ?? 'mei';
  let valor = body.value;

  if (valor === undefined) {
    if (regime === 'simples' && user.simplesAnexo) {
      const receita = await getReceitaMes(user.id, body.year, body.month);
      const rbt12 = await getRBT12(user.id, body.year, body.month);
      const calc = calcularDASMensal({
        regime: 'simples',
        simplesAnexo: user.simplesAnexo,
        receitaMes: receita,
        rbt12,
      });
      valor = calc.value;
    } else {
      const calc = calcularDASMensal({
        regime: 'mei',
        meiAtividade: user.meiAtividade,
      });
      valor = calc.value;
    }
  }

  const dueDate = calcularVencimento(body.month, body.year);

  const payment = await prisma.dASPayment.upsert({
    where: {
      userId_year_month: {
        userId: user.id,
        year: body.year,
        month: body.month,
      },
    },
    create: {
      userId: user.id,
      month: body.month,
      year: body.year,
      value: valor,
      dueDate,
      regime,
    },
    update: { value: valor, dueDate, regime },
  });

  const response = NextResponse.json({ payment });
  response.cookies.set(cookieName, user.id, getCookieOptions());
  return response;
}
