/**
 * Calcula os dados que o MEI precisa pra preencher a DASN-SIMEI no
 * portal da Receita: receita bruta total, separada em comercio/industria
 * vs servicos.
 *
 * Como dividir comercio vs servico:
 *  - Como o app nao categoriza receita por tipo de atividade (so o tipo
 *    da atividade do MEI fica salvo em `meiAtividade`), a logica aqui usa
 *    a atividade declarada como referencia:
 *    - comercio          -> tudo entra como comercio
 *    - industria         -> tudo entra como comercio (no DASN industria
 *                           vai junto com comercio mesmo)
 *    - servicos          -> tudo entra como servico
 *    - comercio_servicos -> 50/50 como sugestao inicial. Usuario ajusta
 *                           manualmente se quiser.
 *
 *  - Em V2, podemos categorizar receita por categoria tambem (cliente vs
 *    venda) pra inferir melhor.
 *
 * GET /api/dasn?year=2025
 *   Default year = ano anterior (que e o que o MEI declara em 2026).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MEI_LIMIT = 81000;

export async function GET(req: NextRequest) {
  const cookieName = getUserCookieName();
  const uid = req.cookies.get(cookieName)?.value;
  if (!uid) return NextResponse.json({ error: 'Sem sessao' }, { status: 401 });

  const url = new URL(req.url);
  const yearParam = url.searchParams.get('year');
  const now = new Date();
  // Default: ano anterior. Em janeiro 2026 declaramos 2025.
  const year = yearParam ? Number(yearParam) : now.getFullYear() - 1;

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { name: true, regime: true, meiAtividade: true, meiInicio: true },
  });

  if (!user) return NextResponse.json({ error: 'User nao encontrado' }, { status: 404 });

  // Pega receita do ano todo
  const receitas = await prisma.transaction.aggregate({
    where: {
      userId: uid,
      type: 'receita',
      date: { gte: yearStart, lt: yearEnd },
    },
    _sum: { amount: true },
    _count: true,
  });

  const receitaBruta = Math.max(0, receitas._sum.amount ?? 0);
  const transacoesCount = receitas._count;

  // Divide comercio vs servico baseado na atividade
  const atividade = user.meiAtividade ?? 'servicos';
  let receitaComercio = 0;
  let receitaServicos = 0;
  let divisaoNota: string | null = null;

  switch (atividade) {
    case 'comercio':
    case 'industria':
      receitaComercio = receitaBruta;
      receitaServicos = 0;
      divisaoNota = `Sua atividade declarada e ${atividade}, entao toda receita conta como comercio/industria.`;
      break;
    case 'servicos':
      receitaComercio = 0;
      receitaServicos = receitaBruta;
      divisaoNota = 'Sua atividade declarada e servicos, entao toda receita conta como prestacao de servico.';
      break;
    case 'comercio_servicos':
      // 50/50 como ponto de partida — usuaria ajusta
      receitaComercio = receitaBruta / 2;
      receitaServicos = receitaBruta / 2;
      divisaoNota = 'Sua atividade declarada e mista (comercio + servicos). Sugerimos 50/50, mas voce deve ajustar pelos seus numeros reais.';
      break;
    default:
      receitaServicos = receitaBruta;
      divisaoNota = 'Atividade nao definida — assumindo servicos. Cadastre sua atividade no perfil pra dividir corretamente.';
  }

  // Status: se passou do teto, o MEI vai precisar avisar a Receita E pode
  // ter cobranca extra. So um aviso visual.
  const passouTeto = receitaBruta > MEI_LIMIT;
  const passouTetoTolerancia = receitaBruta > MEI_LIMIT * 1.2;

  // Periodo de declaracao: 1 jan a 31 mai do ano seguinte
  const periodoInicio = new Date(year + 1, 0, 1);
  const periodoFim = new Date(year + 1, 4, 31, 23, 59, 59);
  const dentroDoPeriodo = now >= periodoInicio && now <= periodoFim;
  const aberto = dentroDoPeriodo;

  // Quantos dias faltam pra prazo (so faz sentido se aberto)
  const diasRestantes = aberto
    ? Math.ceil((periodoFim.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return NextResponse.json({
    year,
    user: {
      name: user.name,
      regime: user.regime,
      meiAtividade: atividade,
    },
    receitaBruta,
    receitaComercio,
    receitaServicos,
    divisaoNota,
    transacoesCount,
    meiLimit: MEI_LIMIT,
    passouTeto,
    passouTetoTolerancia,
    aberto,
    dentroDoPeriodo,
    diasRestantes,
    periodoInicio: periodoInicio.toISOString(),
    periodoFim: periodoFim.toISOString(),
    portalUrl: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao',
  });
}
