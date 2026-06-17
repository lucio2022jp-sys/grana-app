/**
 * Categorizacao de transacoes Pix.
 *
 * Estrategia em camadas:
 * 1. Match com historico do usuario (mesma contraparte ja confirmada antes) - 100% acuracia, custo zero
 * 2. Heuristica rapida (palavras-chave) - cobre ~70% dos casos novos sem IA
 * 3. IA (Anthropic Claude) com few-shot - pega o resto, aprende dos exemplos do usuario
 *
 * Se ANTHROPIC_API_KEY nao estiver setado, cai pra historico + heuristica.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ParsedTx } from './pdf-parser';
import {
  classificarPorHistorico,
  classificarPorRecorrencia,
  correcoesAsExemplos,
  getCorrecoesUsuario,
  getHistoricoConfirmado,
  getPadroesRecorrentes,
  historicoAsExemplos,
  type ClassificacaoConfirmada,
  type CorrecaoUsuario,
} from './learning';
import type { TxType } from './tx-types';
import { TX_TYPES } from './tx-types';

export type TxClassification = {
  type: TxType;
  category: string;
  isDeductible: boolean;
  isPersonal: boolean;
  confidence: number; // 0-1
  reasoning?: string;
};

const CATEGORIES_BUSINESS = [
  'produto',          // esmalte, alicate, algodao
  'equipamento',      // cadeira, secador, luminaria
  'marketing',        // anuncio, cartao de visita
  'transporte',       // uber pra atender, gasolina
  'aluguel',          // aluguel de cadeira ou espaco
  'servicos',         // contador, internet
  'curso',            // formacao na area
  'cliente',          // recebimento de cliente
] as const;

const CATEGORIES_PERSONAL = [
  'alimentacao',      // mercado, restaurante
  'lazer',            // cinema, bar
  'casa',             // aluguel, luz, agua
  'saude',            // farmacia, plano
  'transporte_pessoal',
  'familia',          // parente, escola
  'outros',
] as const;

/**
 * Regras heuristicas extras baseadas na profissao do usuario.
 * Cada profissao tem palavras-chave que indicam despesa do negocio.
 *
 * O match e tudo minusculo e sem acento (o caller ja normaliza).
 */
const PROFISSAO_RULES: Record<string, Array<{ patterns: string[]; classification: Partial<TxClassification> }>> = {
  // beleza: salao, manicure, cabeleireira, esteticista, depiladora
  beleza: [
    { patterns: ['esmalte', 'alicate', 'algodao', 'acetona', 'lixa', 'cuticula', 'gel', 'polidor', 'unha'], classification: { type: 'despesa', category: 'produto', isDeductible: true, confidence: 0.92 } },
    { patterns: ['shampoo', 'condicionador', 'tinta de cabelo', 'matizador', 'po descolorante', 'ox ', 'tonalizante', 'progressiva'], classification: { type: 'despesa', category: 'produto', isDeductible: true, confidence: 0.92 } },
    { patterns: ['cera', 'spatula', 'descartavel', 'depilacao', 'hot wax'], classification: { type: 'despesa', category: 'produto', isDeductible: true, confidence: 0.9 } },
    { patterns: ['cadeira do salao', 'aluguel cadeira', 'aluguel sala beleza'], classification: { type: 'despesa', category: 'aluguel', isDeductible: true, confidence: 0.9 } },
  ],
  motorista: [
    { patterns: ['posto', 'gasolina', 'etanol', 'shell', 'ipiranga', 'br distrib', 'petrobras', 'combustivel'], classification: { type: 'despesa', category: 'transporte', isDeductible: true, confidence: 0.95 } },
    { patterns: ['lavagem', 'oleo do motor', 'troca de oleo', 'pneu', 'mecanica', 'auto center', 'revisao'], classification: { type: 'despesa', category: 'equipamento', isDeductible: true, confidence: 0.85 } },
    { patterns: ['ipva', 'licenciamento', 'detran', 'multa de transito'], classification: { type: 'despesa', category: 'servicos', isDeductible: true, confidence: 0.9 } },
    { patterns: ['uber repasse', 'uber pagamento', '99 repasse', '99pop pagamento', 'indriver', 'cabify pagamento'], classification: { type: 'receita', category: 'cliente', confidence: 0.95 } },
  ],
  dev: [
    { patterns: ['github', 'vercel', 'netlify', 'aws', 'amazon web', 'gcp', 'google cloud', 'digital ocean', 'cloudflare', 'render.com', 'supabase', 'planetscale'], classification: { type: 'despesa', category: 'servicos', isDeductible: true, confidence: 0.95 } },
    { patterns: ['jetbrains', 'intellij', 'sublime', 'figma', 'notion', 'linear', 'sentry', 'datadog', 'mixpanel', 'posthog'], classification: { type: 'despesa', category: 'servicos', isDeductible: true, confidence: 0.9 } },
    { patterns: ['udemy', 'frontendmasters', 'pluralsight', 'rocketseat', 'alura', 'coursera'], classification: { type: 'despesa', category: 'curso', isDeductible: true, confidence: 0.9 } },
  ],
  professor: [
    { patterns: ['livro', 'editora', 'apostila', 'material didatico', 'caderno', 'caneta', 'papelaria'], classification: { type: 'despesa', category: 'produto', isDeductible: true, confidence: 0.85 } },
    { patterns: ['plataforma de ensino', 'zoom', 'google workspace', 'classroom'], classification: { type: 'despesa', category: 'servicos', isDeductible: true, confidence: 0.85 } },
  ],
  saude: [
    { patterns: ['luva descartavel', 'mascara descartavel', 'gaze', 'algodao', 'esparadrapo', 'antisseptico', 'soro fisiologico', 'agulha', 'seringa'], classification: { type: 'despesa', category: 'produto', isDeductible: true, confidence: 0.9 } },
    { patterns: ['conselho regional', 'crm anuidade', 'crefito', 'corem', 'crp anuidade', 'crn anuidade'], classification: { type: 'despesa', category: 'servicos', isDeductible: true, confidence: 0.95 } },
  ],
  fotografo: [
    { patterns: ['canon', 'nikon', 'sony alpha', 'lente', 'tripe', 'flash', 'cartao sd', 'estabilizador', 'gimbal'], classification: { type: 'despesa', category: 'equipamento', isDeductible: true, confidence: 0.92 } },
    { patterns: ['adobe', 'lightroom', 'photoshop', 'capture one'], classification: { type: 'despesa', category: 'servicos', isDeductible: true, confidence: 0.95 } },
  ],
};

/**
 * Tenta inferir o "perfil" da profissao do usuario pra escolher o set de regras.
 * Mantem mapeamento simples — usuario pode ter cadastrado a profissao em texto livre.
 */
function perfilDaProfissao(profissao: string | undefined): keyof typeof PROFISSAO_RULES | undefined {
  if (!profissao) return undefined;
  const p = profissao.toLowerCase();
  if (/manicure|cabeleire|esteticist|salao|barbeir|depila|maquia/.test(p)) return 'beleza';
  if (/motorist|uber|99pop|caminhone|taxis|app de transporte/.test(p)) return 'motorista';
  if (/desenvolved|programad|engenheir.*software|dev\b|frontend|backend|full[- ]?stack/.test(p)) return 'dev';
  if (/professor|tutor|educador|pedagog/.test(p)) return 'professor';
  if (/medic|enfermeir|fisioterap|nutricion|psicolog|odontolog|dentista|terapeut/.test(p)) return 'saude';
  if (/fotograf|videomak|cinegraf|cinegrafist/.test(p)) return 'fotografo';
  return undefined;
}

/**
 * Categorizacao por heuristica.
 * Rapida, sem custo, cobre bem casos obvios.
 */
export function classifyHeuristic(tx: ParsedTx, profissao?: string): TxClassification {
  const text = (tx.description + ' ' + (tx.contraparte ?? '')).toLowerCase();
  const isPositive = tx.amount > 0;
  const valor = Math.abs(tx.amount);

  // Detecta tipos especiais antes do default (receita/despesa)
  // 1. Transferencia entre contas proprias
  if (/\b(ted|doc|transferencia|transferiu|pix recebido de mim|para mim|entre contas|conta corrente|conta poupanca)\b/.test(text) && /(mesmo titular|titularidade|propria conta|minha conta)/.test(text)) {
    return {
      type: 'transferencia',
      category: 'transferencia',
      isDeductible: false,
      isPersonal: false,
      confidence: 0.85,
      reasoning: 'transferencia entre contas proprias',
    };
  }

  // 2. Investimento (CDB, Tesouro, ações, fundos)
  if (/\b(cdb|tesouro direto|nubank investimento|nuinvest|xp investimento|rico|clear|btg pactual digital|inter invest|c6 invest|aplicacao|resgate aplicacao|fundo de investimento|fii|acoes|tesouro selic|previdencia)\b/.test(text)) {
    return {
      type: 'investimento',
      category: 'investimento',
      isDeductible: false,
      isPersonal: false,
      confidence: 0.9,
      reasoning: 'aplicacao ou resgate de investimento',
    };
  }

  // 3. Emprestimo (entrada ou saida)
  if (/\b(emprestimo|financiamento|crediario|crefisa|bmg consig|banco pan|santander emp|bradesco emp|fgts antecipa|consignado|cartao consignado|noverde|geru|creditas)\b/.test(text)) {
    return {
      type: 'emprestimo',
      category: 'emprestimo',
      isDeductible: false,
      isPersonal: false,
      confidence: 0.85,
      reasoning: 'movimentacao de emprestimo',
    };
  }

  // 4. Reembolso/estorno
  if (/\b(estorno|reembolso|devolucao|cancelamento de cobranca|chargeback)\b/.test(text)) {
    return {
      type: 'reembolso',
      category: 'reembolso',
      isDeductible: false,
      isPersonal: false,
      confidence: 0.9,
      reasoning: 'estorno ou reembolso',
    };
  }

  // 5. Retirada / pro-labore (saida pra conta pessoal do dono)
  if (!isPositive && /\b(retirada|distribuicao de lucros|pro-labore|prolabore|para o proprietario|saque proprietario)\b/.test(text)) {
    const isProlabore = /\b(pro-?labore|distribuicao)\b/.test(text);
    return {
      type: isProlabore ? 'prolabore' : 'retirada',
      category: isProlabore ? 'prolabore' : 'retirada',
      isDeductible: false,
      isPersonal: false,
      confidence: 0.85,
      reasoning: isProlabore ? 'pro-labore identificado' : 'retirada do socio',
    };
  }

  // Receita: entrada de Pix sem indicios de ser outra coisa
  if (isPositive) {
    // Antes do default, checa regras da profissao que classificam entradas
    // (ex: "uber repasse" = receita, nao despesa)
    const perfilEntrada = perfilDaProfissao(profissao);
    if (perfilEntrada && PROFISSAO_RULES[perfilEntrada]) {
      for (const rule of PROFISSAO_RULES[perfilEntrada]) {
        if (rule.classification.type !== 'receita') continue;
        if (rule.patterns.some((p) => text.includes(p))) {
          return {
            type: 'receita',
            category: rule.classification.category ?? 'cliente',
            isDeductible: false,
            isPersonal: false,
            confidence: rule.classification.confidence ?? 0.85,
            reasoning: `entrada tipica da profissao (${perfilEntrada}): ${rule.patterns.find((p) => text.includes(p))}`,
          };
        }
      }
    }
    return {
      type: 'receita',
      category: 'cliente',
      isDeductible: false,
      isPersonal: false,
      confidence: 0.7,
      reasoning: 'entrada de Pix presumida como receita',
    };
  }

  // Saidas - heuristicas por palavra-chave
  const rules: Array<{ patterns: string[]; classification: Partial<TxClassification> }> = [
    {
      patterns: ['esmalte', 'alicate', 'algodao', 'acetona', 'beauty', 'cosmetico', 'distribuidora', 'unha', 'cabelo', 'tinta', 'shampoo', 'condicionador'],
      classification: { type: 'despesa', category: 'produto', isDeductible: true, confidence: 0.9 },
    },
    {
      patterns: ['cadeira', 'secador', 'maca', 'luminaria', 'estrutura', 'movel'],
      classification: { type: 'despesa', category: 'equipamento', isDeductible: true, confidence: 0.85 },
    },
    {
      patterns: ['instagram', 'facebook', 'anuncio', 'impulsionament', 'meta ads', 'google ads', 'cartao de visita'],
      classification: { type: 'despesa', category: 'marketing', isDeductible: true, confidence: 0.95 },
    },
    {
      patterns: ['uber', '99', 'taxi', 'gasolina', 'posto', 'shell', 'ipiranga', 'br distrib'],
      classification: { type: 'despesa', category: 'transporte', isDeductible: true, confidence: 0.7 },
    },
    {
      patterns: ['aluguel', 'condominio', 'cadeira do salao'],
      classification: { type: 'despesa', category: 'aluguel', isDeductible: true, confidence: 0.85 },
    },
    {
      patterns: ['contador', 'cnpj', 'simples nacional', 'das', 'darf', 'imposto'],
      classification: { type: 'despesa', category: 'servicos', isDeductible: true, confidence: 0.9 },
    },
    {
      patterns: ['curso', 'formacao', 'workshop', 'treinament'],
      classification: { type: 'despesa', category: 'curso', isDeductible: true, confidence: 0.8 },
    },
    {
      patterns: ['ifood', 'rappi', 'mcdonald', 'burger', 'restaurante', 'lanchonete', 'padaria', 'mercado', 'supermercado', 'pao de acucar', 'extra', 'carrefour'],
      classification: { type: 'pessoal', category: 'alimentacao', isPersonal: true, confidence: 0.9 },
    },
    {
      patterns: ['netflix', 'spotify', 'amazon prime', 'cinema', 'show', 'ingresso'],
      classification: { type: 'pessoal', category: 'lazer', isPersonal: true, confidence: 0.95 },
    },
    {
      patterns: ['enel', 'cemig', 'sabesp', 'comgas', 'vivo', 'claro', 'tim', 'oi', 'internet', 'luz', 'agua'],
      classification: { type: 'pessoal', category: 'casa', isPersonal: true, confidence: 0.85 },
    },
    {
      patterns: ['drogaria', 'farmacia', 'plano de saude', 'unimed', 'amil', 'hapvida'],
      classification: { type: 'pessoal', category: 'saude', isPersonal: true, confidence: 0.9 },
    },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((p) => text.includes(p))) {
      return {
        type: rule.classification.type ?? 'despesa',
        category: rule.classification.category ?? 'outros',
        isDeductible: rule.classification.isDeductible ?? false,
        isPersonal: rule.classification.isPersonal ?? false,
        confidence: rule.classification.confidence ?? 0.5,
        reasoning: `match heuristico: ${rule.patterns.find((p) => text.includes(p))}`,
      };
    }
  }

  // Regras especificas da profissao do usuario (despesas tipicas do oficio).
  // Tem prioridade abaixo dos defaults universais pra nao mascarar transferencias,
  // investimento, etc., mas acima do "outros" generico.
  const perfil = perfilDaProfissao(profissao);
  if (perfil && PROFISSAO_RULES[perfil]) {
    for (const rule of PROFISSAO_RULES[perfil]) {
      if (rule.patterns.some((p) => text.includes(p))) {
        return {
          type: rule.classification.type ?? 'despesa',
          category: rule.classification.category ?? 'outros',
          isDeductible: rule.classification.isDeductible ?? false,
          isPersonal: rule.classification.isPersonal ?? false,
          confidence: rule.classification.confidence ?? 0.6,
          reasoning: `match por profissao (${perfil}): ${rule.patterns.find((p) => text.includes(p))}`,
        };
      }
    }
  }

  // Default: despesa nao categorizada (baixa confianca, vai pra IA)
  return {
    type: 'despesa',
    category: 'outros',
    isDeductible: false,
    isPersonal: false,
    confidence: 0.3,
    reasoning: 'sem match heuristico',
  };
}

const ALL_CATEGORIES = new Set([...CATEGORIES_BUSINESS, ...CATEGORIES_PERSONAL] as const);
const TX_TYPE_SET: Set<string> = new Set(TX_TYPES);

/**
 * Valida e sanitiza um item bruto vindo da IA. Garante:
 *  - type pertence ao enum (senao cai pra "despesa")
 *  - category pertence ao enum (senao "outros")
 *  - flags coerentes com o type (deductible so se despesa, personal so se pessoal)
 */
function sanitizeAIClassification(item: any, fallbackTx: ParsedTx, profissao?: string): TxClassification {
  if (!item || typeof item !== 'object') return classifyHeuristic(fallbackTx, profissao);

  let type: TxType = TX_TYPE_SET.has(item.type) ? (item.type as TxType) : 'despesa';
  const category: string = typeof item.category === 'string' && ALL_CATEGORIES.has(item.category as any)
    ? item.category
    : 'outros';

  let isDeductible = !!item.isDeductible;
  let isPersonal = !!item.isPersonal;
  if (type !== 'despesa') isDeductible = false;
  if (type !== 'pessoal') isPersonal = false;

  let confidence = typeof item.confidence === 'number' ? item.confidence : 0.5;
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  return {
    type,
    category,
    isDeductible,
    isPersonal,
    confidence,
    reasoning: typeof item.reasoning === 'string' ? item.reasoning : undefined,
  };
}

const AI_BATCH_LIMIT = 30;

async function classifyAIBatch(
  client: Anthropic,
  txs: ParsedTx[],
  profissao: string | undefined,
  systemPrompt: string,
): Promise<TxClassification[]> {
  const userMessage = `Transacoes pra classificar:
${txs.map((tx, i) => `${i}. ${tx.amount > 0 ? '+' : ''}R$ ${tx.amount.toFixed(2)} | ${tx.description} | ${tx.contraparte ?? '-'}${tx.contraparteDoc ? ` | doc=${tx.contraparteDoc}` : ''}`).join('\n')}`;

  // Tool use (function calling): a resposta vem em JSON estruturado e validado
  // pelo SDK. Elimina o parse manual de markdown fences que falhava em casos
  // raros e garante que o shape seja sempre o esperado.
  const tool = {
    name: 'classify_transactions',
    description: 'Classifica um lote de transacoes financeiras na ordem recebida.',
    input_schema: {
      type: 'object' as const,
      properties: {
        classifications: {
          type: 'array',
          description: 'Uma classificacao por transacao, na MESMA ordem do input.',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: [...TX_TYPES],
                description: 'Tipo da transacao',
              },
              category: {
                type: 'string',
                enum: [...CATEGORIES_BUSINESS, ...CATEGORIES_PERSONAL],
                description: 'Categoria especifica',
              },
              isDeductible: {
                type: 'boolean',
                description: 'true SO se type="despesa" e for gasto comprovado do trabalho',
              },
              isPersonal: {
                type: 'boolean',
                description: 'true SO se type="pessoal"',
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Confianca da classificacao de 0 a 1',
              },
              reasoning: {
                type: 'string',
                description: 'Motivo curto da classificacao',
              },
            },
            required: ['type', 'category', 'isDeductible', 'isPersonal', 'confidence'],
          },
        },
      },
      required: ['classifications'],
    },
  };

  const resp = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        // Prompt caching: o systemPrompt repete entre batches do mesmo usuario,
        // entao cache_control corta custo das chamadas seguintes.
        ...(({ cache_control: { type: 'ephemeral' } } as any)),
      },
    ],
    tools: [tool as any],
    tool_choice: { type: 'tool', name: 'classify_transactions' } as any,
    messages: [{ role: 'user', content: userMessage }],
  } as any);

  const toolBlock = resp.content.find((c: any) => c.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Resposta da IA sem tool_use');
  }
  const input = (toolBlock as any).input;
  const arr = Array.isArray(input?.classifications) ? input.classifications : null;
  if (!arr) throw new Error('Resposta da IA sem array classifications');

  // Alinha pelo indice. Se a IA devolver menos itens, completa com heuristica.
  return txs.map((tx, i) => sanitizeAIClassification(arr[i], tx, profissao));
}

/**
 * Refinamento com IA (Claude).
 * Recebe varias transacoes ambiguas e classifica em batch (chunkado).
 */
export async function classifyWithAI(
  txs: ParsedTx[],
  profissao?: string,
  historico: ClassificacaoConfirmada[] = [],
  correcoes: CorrecaoUsuario[] = [],
): Promise<TxClassification[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Sem chave, retorna heuristica
    return txs.map((tx) => classifyHeuristic(tx, profissao));
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const exemplos = historicoAsExemplos(historico, 15);
  const negativos = correcoesAsExemplos(correcoes, 10);

  const systemPrompt = `Voce e um assistente que classifica transacoes financeiras de profissionais autonomos brasileiros.

Profissao do usuario: ${profissao ?? 'autonoma de beleza'}

Para cada transacao recebida, classifique com:
- type: um dos seguintes:
    "receita"        - cliente pagou pelo servico/produto
    "despesa"        - gasto pra manter o negocio (produtos, marketing, etc.)
    "pessoal"        - gasto pessoal sem ligacao com trabalho (mercado, lazer)
    "transferencia"  - entre contas proprias do mesmo dono
    "prolabore"      - salario do socio/dono da empresa
    "retirada"       - dono tirou dinheiro pra conta pessoal (NAO e despesa)
    "emprestimo"     - movimentacao de emprestimo (entrada ou saida)
    "investimento"   - aplicacao ou resgate de investimento
    "reembolso"      - estorno, devolucao, cancelamento
- category: uma das [${[...CATEGORIES_BUSINESS, ...CATEGORIES_PERSONAL].join(', ')}]
- isDeductible: true SO se type="despesa" e for gasto comprovado do trabalho
- isPersonal: true SO se type="pessoal"
- confidence: 0 a 1
- reasoning: motivo curto da classificacao${exemplos}${negativos}

Use a tool "classify_transactions" pra responder. Mantenha a MESMA ordem do input no array de saida.`;

  // Quebra em chunks pra nao estourar tokens nem demorar minutos.
  // O systemPrompt fica cacheado, entao chunks adicionais saem mais baratos.
  const chunks: ParsedTx[][] = [];
  for (let i = 0; i < txs.length; i += AI_BATCH_LIMIT) {
    chunks.push(txs.slice(i, i + AI_BATCH_LIMIT));
  }

  const resultado: TxClassification[] = [];
  for (const chunk of chunks) {
    try {
      const out = await classifyAIBatch(client, chunk, profissao, systemPrompt);
      resultado.push(...out);
    } catch (err) {
      console.error('Erro na classificacao IA, caindo pra heuristica neste chunk:', err);
      resultado.push(...chunk.map((tx) => classifyHeuristic(tx, profissao)));
    }
  }

  return resultado;
}

export type ClassifyMetrics = {
  totalTxs: number;
  fromHistory: number;
  fromHeuristic: number;
  fromAI: number;
  aiCallsCount: number;
  aiTxsCount: number;
};

export type ClassifyResult = {
  classifications: TxClassification[];
  metrics: ClassifyMetrics;
};

/**
 * Pipeline completo:
 *  1. Match com historico do usuario (custo zero, alta acuracia)
 *  2. Heuristica por palavra-chave
 *  3. IA com few-shot pros casos de baixa confianca
 */
export async function classifyTransactions(
  txs: ParsedTx[],
  profissao?: string,
  userId?: string,
): Promise<TxClassification[]> {
  const { classifications } = await classifyTransactionsDetailed(txs, profissao, userId);
  return classifications;
}

/**
 * Versao do pipeline que tambem devolve telemetria por camada.
 * Use quando voce vai gravar metricas (ex: rota de upload).
 */
export async function classifyTransactionsDetailed(
  txs: ParsedTx[],
  profissao?: string,
  userId?: string,
): Promise<ClassifyResult> {
  // 0. Busca historico confirmado, padroes recorrentes e correcoes do usuario
  const [historico, padroes, correcoes] = userId
    ? await Promise.all([
        getHistoricoConfirmado(userId, 200),
        getPadroesRecorrentes(userId),
        getCorrecoesUsuario(userId, 30),
      ])
    : [[] as ClassificacaoConfirmada[], [], [] as CorrecaoUsuario[]];

  // 1. Tenta historico confirmado, depois recorrencia, depois heuristica.
  // Marca a origem em sourceLayer pra alimentar a telemetria.
  type Layer = 'history' | 'heuristic' | 'ai';
  const sourceLayer: Layer[] = [];
  const initial: TxClassification[] = txs.map((tx) => {
    const fromHistory = classificarPorHistorico(tx, historico);
    if (fromHistory) {
      sourceLayer.push('history');
      return fromHistory;
    }
    const fromRecurring = classificarPorRecorrencia(tx, padroes);
    if (fromRecurring) {
      sourceLayer.push('history');
      return fromRecurring;
    }
    sourceLayer.push('heuristic');
    return classifyHeuristic(tx, profissao);
  });

  // 2. Identifica casos de baixa confianca pra mandar pra IA
  const lowConfidenceIdx: number[] = [];
  initial.forEach((c, i) => {
    if (c.confidence < 0.5) lowConfidenceIdx.push(i);
  });

  let aiCallsCount = 0;
  let aiTxsCount = 0;

  if (lowConfidenceIdx.length === 0 || !process.env.ANTHROPIC_API_KEY) {
    return {
      classifications: initial,
      metrics: buildMetrics(txs.length, sourceLayer, aiCallsCount, aiTxsCount),
    };
  }

  // 3. Envia em batch pra IA com exemplos do historico
  const txsToRefine = lowConfidenceIdx.map((i) => txs[i]);
  aiTxsCount = txsToRefine.length;
  aiCallsCount = Math.ceil(txsToRefine.length / AI_BATCH_LIMIT);

  const refined = await classifyWithAI(txsToRefine, profissao, historico, correcoes);

  // 4. Substitui no array final e atualiza camada de origem
  const result = [...initial];
  lowConfidenceIdx.forEach((origIdx, refinedIdx) => {
    if (refined[refinedIdx]) {
      result[origIdx] = refined[refinedIdx];
      sourceLayer[origIdx] = 'ai';
    }
  });

  return {
    classifications: result,
    metrics: buildMetrics(txs.length, sourceLayer, aiCallsCount, aiTxsCount),
  };
}

function buildMetrics(
  total: number,
  layers: Array<'history' | 'heuristic' | 'ai'>,
  aiCallsCount: number,
  aiTxsCount: number,
): ClassifyMetrics {
  let fromHistory = 0;
  let fromHeuristic = 0;
  let fromAI = 0;
  for (const l of layers) {
    if (l === 'history') fromHistory += 1;
    else if (l === 'heuristic') fromHeuristic += 1;
    else fromAI += 1;
  }
  return {
    totalTxs: total,
    fromHistory,
    fromHeuristic,
    fromAI,
    aiCallsCount,
    aiTxsCount,
  };
}
