/**
 * Smoke test do classificador. Roda heuristica e checa shapes basicos
 * sem depender da API da Anthropic. Use:
 *   npx tsx scripts/smoke-classifier.ts
 */
import { classifyHeuristic } from '../src/lib/classifier';
import type { ParsedTx } from '../src/lib/pdf-parser';

const cases: Array<{ tx: ParsedTx; profissao?: string; expectType: string; expectCat?: string }> = [
  {
    tx: { date: new Date(), description: 'Compra esmalte beauty distribuidora', amount: -120, contraparte: 'Beauty Color Ltda' },
    profissao: 'manicure',
    expectType: 'despesa',
    expectCat: 'produto',
  },
  {
    tx: { date: new Date(), description: 'IFOOD pedido 1234', amount: -55, contraparte: 'iFood' },
    expectType: 'pessoal',
    expectCat: 'alimentacao',
  },
  {
    tx: { date: new Date(), description: 'PIX recebido cliente', amount: 200, contraparte: 'Maria' },
    expectType: 'receita',
  },
  {
    tx: { date: new Date(), description: 'TED mesmo titular entre contas proprias', amount: -1000, contraparte: 'Yuji - Conta Poupanca' },
    expectType: 'transferencia',
  },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const res = classifyHeuristic(c.tx, c.profissao);
  const ok =
    res.type === c.expectType &&
    (!c.expectCat || res.category === c.expectCat) &&
    res.confidence >= 0 && res.confidence <= 1;
  if (ok) {
    pass += 1;
    console.log(`PASS  ${c.tx.description} -> ${res.type}/${res.category} (${res.confidence.toFixed(2)})`);
  } else {
    fail += 1;
    console.log(`FAIL  ${c.tx.description} -> ${res.type}/${res.category} (esperava ${c.expectType}/${c.expectCat ?? '*'})`);
  }
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
