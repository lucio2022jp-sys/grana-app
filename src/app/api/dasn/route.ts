/**
 * Calcula os dados que o MEI precisa pra preencher a DASN-SIMEI no
 * portal da Receita: receita bruta total, separada em comercio/industria
 * vs servicos.
 *
 * Como dividir comercio vs servico:
 *  - Quando a transacao tem `natureza` preenchida (toggle no form),
 *    respeitamos a classificacao manual: 'produto' -> comercio, 'servico'
 *    -> servicos. E o caminho preferido e mais preciso.
 *  - Quando `natureza` e null, caimos no fallback automatico pela atividade
 *    declarada do MEI (`meiAtividade`):
 *    - comercio          -> tudo entra como comercio
 *    - industria         -> tudo entra como comercio (industria + comercio
 *                           ficam juntos no DASN)
 *    - servicos          -> tudo entra como servico
 *    - comercio_servicos -> 50/50 como sugestao inicial
 *
 *  Quando o usuario classifica parcialmente (algumas tx com natureza,
 *  outras sem), aplicamos cada regra na sua porcao: o classificado vai
 *  direto, o nao classificado segue o fallback da atividade.
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

  // Pega receita do ano todo. Carregamos amount+natureza por tx pra poder
  // separar produto/servico no nivel do registro.
  const txs = await prisma.transaction.findMany({
    where: {
      userId: uid,
      type: 'receita',
      date: { gte: yearStart, lt: yearEnd },
    },
    select: { amount: true, natureza: true },
  });

  const receitaBruta = Math.max(
    0,
    txs.reduce((sum, t) => sum + t.amount, 0),
  );
  const transacoesCount = txs.length;

  // Receita ja classificada manualmente pelo usuario (toggle).
  const receitaProdutoManual = txs
    .filter((t) => t.natureza === 'produto')
    .reduce((s, t) => s + t.amount, 0);
  const receitaServicoManual = txs
    .filter((t) => t.natureza === 'servico')
    .reduce((s, t) => s + t.amount, 0);
  const receitaSemClassificacao = txs
    .filter((t) => t.natureza !== 'produto' && t.natureza !== 'servico')
    .reduce((s, t) => s + t.amount, 0);

  // Aplica fallback pela atividade so na parcela sem classificacao manual.
  const atividade = user.meiAtividade ?? 'servicos';
  let comercioFallback = 0;
  let servicosFallback = 0;
  let fallbackNota: string | null = null;

  switch (atividade) {
    case 'comercio':
    case 'industria':
      comercioFallback = receitaSemClassificacao;
      fallbackNota = `Receitas sem categoria foram contadas como comercio/industria (sua atividade declarada e ${atividade}).`;
      break;
    case 'servicos':
      servicosFallback = receitaSemClassificacao;
      fallbackNota = 'Receitas sem categoria foram contadas como servico (sua atividade declarada).';
      break;
    case 'comercio_servicos':
      comercioFallback = receitaSemClassificacao / 2;
      servicosFallback = receitaSemClassificacao / 2;
      fallbackNota = 'Receitas sem categoria foram divididas 50/50 (atividade mista). Marque produto/servico em cada lancamento pra ficar exato.';
      break;
    default:
      servicosFallback = receitaSemClassificacao;
      fallbackNota = 'Atividade nao definida — receitas sem categoria foram contadas como servico. Cadastre sua atividade no perfil.';
  }

  const receitaComercio = receitaProdutoManual + comercioFallback;
  const receitaServicos = receitaServicoManual + servicosFallback;

  // Texto da nota: prioriza dizer o que o usuario classificou direto.
  let divisaoNota: string | null = null;
  const totalManual = receitaProdutoManual + receitaServicoManual;
  if (totalManual > 0 && receitaSemClassificacao === 0) {
    divisaoNota = 'Divisao baseada na natureza (produto/servico) marcada em cada lancamento.';
  } else if (totalManual > 0 && receitaSemClassificacao > 0) {
    divisaoNota = `Parte das receitas (${formatBRL(totalManual)}) foi classificada manualmente; o restante seguiu o fallback da sua atividade. ${fallbackNota}`;
  } else {
    divisaoNota = fallbackNota;
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

  // Ja entregou? Se ja tem recibo do ano-base, o banner some no dashboard.
  const reciboExistente = await prisma.dasnRecibo.findFirst({
    where: { userId: uid, year },
    select: { id: true },
  });
  const jaDeclarado = !!reciboExistente;

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
    receitaProdutoManual,
    receitaServicoManual,
    receitaSemClassificacao,
    divisaoNota,
    transacoesCount,
    meiLimit: MEI_LIMIT,
    passouTeto,
    passouTetoTolerancia,
    aberto,
    dentroDoPeriodo,
    diasRestantes,
    jaDeclarado,
    periodoInicio: periodoInicio.toISOString(),
    periodoFim: periodoFim.toISOString(),
    portalUrl: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao',
  });
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
