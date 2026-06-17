/**
 * Smoke test do extrator de CPF/CNPJ (pdf-parser.extrairDocumento) e do
 * pipeline de classificacao por documento (learning.classificarPorHistorico).
 *
 * Roda offline, sem chamar a API da Anthropic. Use:
 *   npx tsx scripts/smoke-parser-doc.ts
 */
import { extrairDocumento, parsePixText } from '../src/lib/pdf-parser';
import { classificarPorHistorico, type ClassificacaoConfirmada } from '../src/lib/learning';

let pass = 0;
let fail = 0;

function assert(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass += 1;
    console.log(`PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

// 1. extrairDocumento — formatos comuns
{
  const cpf = extrairDocumento('Pix enviado para Maria Silva, CPF: 123.456.789-00, R$ 50,00');
  assert('CPF formatado', cpf === '12345678900', `recebeu ${cpf}`);
}
{
  const cnpj = extrairDocumento('Pix para BEAUTY COLOR LTDA  12.345.678/0001-90 R$ 200,00');
  assert('CNPJ formatado', cnpj === '12345678000190', `recebeu ${cnpj}`);
}
{
  const mascarado = extrairDocumento('Pix de Maria Silva ***.456.789-** R$ 80,00');
  assert('CPF mascarado e ignorado', mascarado === undefined, `recebeu ${mascarado}`);
}
{
  const semDoc = extrairDocumento('Pix recebido de Joao R$ 100,00');
  assert('Linha sem documento -> undefined', semDoc === undefined, `recebeu ${semDoc}`);
}
{
  // CNPJ puro 14 digitos. Note que precisa de delimitador antes/depois.
  const cnpjPuro = extrairDocumento('Transferencia CNPJ 12345678000190 valor 50');
  assert('CNPJ puro com prefixo CNPJ', cnpjPuro === '12345678000190', `recebeu ${cnpjPuro}`);
}

// 2. parsePixText — bloco de extrato com data + valor + doc
{
  const txt = `
01/06/2026  Pix enviado para BEAUTY COLOR LTDA
            CNPJ: 12.345.678/0001-90
            R$ 300,00

03/06/2026  Pix recebido de MARIA SILVA
            CPF: 123.456.789-00
            R$ 80,00
`;
  const result = parsePixText(txt);
  const docs = result.transactions.map((t) => t.contraparteDoc);
  assert(
    'parsePixText extrai CNPJ no primeiro bloco',
    docs.includes('12345678000190'),
    `docs=${JSON.stringify(docs)}`,
  );
  assert(
    'parsePixText extrai CPF no segundo bloco',
    docs.includes('12345678900'),
    `docs=${JSON.stringify(docs)}`,
  );
}

// 3. classificarPorHistorico — match por CPF/CNPJ vence o match por nome
{
  const historico: ClassificacaoConfirmada[] = [
    {
      contraparte: 'BEAUTY COLOR LTDA',
      contraparteDoc: '12345678000190',
      description: 'Compra de esmaltes',
      amount: -250,
      type: 'despesa',
      category: 'produto',
      isDeductible: true,
      isPersonal: false,
    },
  ];

  // Mesmo CNPJ, nome formatado diferente -> deve casar com confianca 0.99
  const tx = {
    date: new Date(),
    description: 'Compra novo lote',
    amount: -180,
    contraparte: 'BEAUTY C. LTDA',
    contraparteDoc: '12345678000190',
  };
  const cls = classificarPorHistorico(tx, historico);
  assert(
    'Match por CNPJ acerta a classificacao',
    cls?.type === 'despesa' && cls?.category === 'produto',
    JSON.stringify(cls),
  );
  assert(
    'Match por CNPJ entrega confianca 0.99',
    !!cls && cls.confidence === 0.99,
    JSON.stringify(cls),
  );
}

// 4. classificarPorHistorico — sinal contrario nao casa
{
  const historico: ClassificacaoConfirmada[] = [
    {
      contraparte: 'BEAUTY COLOR LTDA',
      contraparteDoc: '12345678000190',
      description: 'Compra',
      amount: -100,
      type: 'despesa',
      category: 'produto',
      isDeductible: true,
      isPersonal: false,
    },
  ];

  // Mesmo CNPJ mas entrada (sinal contrario) — nao casa, cai pra null
  const tx = {
    date: new Date(),
    description: 'Reembolso',
    amount: 100,
    contraparteDoc: '12345678000190',
  };
  const cls = classificarPorHistorico(tx, historico);
  assert(
    'Match por CNPJ exige mesmo sinal',
    cls === null,
    JSON.stringify(cls),
  );
}

// 5. Sem doc no historico, fallback no nome funciona
{
  const historico: ClassificacaoConfirmada[] = [
    {
      contraparte: 'Sandra M Costa',
      contraparteDoc: null,
      description: 'Pagamento manicure',
      amount: 120,
      type: 'receita',
      category: 'cliente',
      isDeductible: false,
      isPersonal: false,
    },
  ];
  const tx = {
    date: new Date(),
    description: 'Pix recebido',
    amount: 120,
    contraparte: 'Sandra Costa M',
  };
  const cls = classificarPorHistorico(tx, historico);
  assert(
    'Fallback de nome sem doc cobre receita por tokens iguais',
    cls?.type === 'receita',
    JSON.stringify(cls),
  );
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
