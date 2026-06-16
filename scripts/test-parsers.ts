/**
 * Teste manual de parsers OFX e CSV.
 * Roda com: npx tsx scripts/test-parsers.ts
 */

import { parseOfx } from '../src/lib/ofx-parser';
import { parseCsv } from '../src/lib/csv-parser';
import { detectFormat } from '../src/lib/extract-parser';

const SAMPLE_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<DTSERVER>20260615120000[-3:BRT]
<LANGUAGE>POR
<FI><ORG>Nubank<FID>260</FI>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>0
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM><BANKID>0260<ACCTID>123456<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260601000000[-3:BRT]
<DTEND>20260615000000[-3:BRT]
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260601100000[-3:BRT]
<TRNAMT>80.00
<FITID>20260601001
<MEMO>Pix recebido de MARIA SILVA
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260603143000[-3:BRT]
<TRNAMT>-300.00
<FITID>20260603001
<MEMO>Pix enviado para BEAUTY COLOR LTDA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260605120000[-3:BRT]
<TRNAMT>120.00
<FITID>20260605001
<MEMO>Pix recebido de ANA SOUZA
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

const SAMPLE_CSV_NUBANK = `Data,Valor,Identificador,Descricao
01/06/2026,80.00,abc123,Transferência recebida pelo Pix - MARIA SILVA
03/06/2026,-300.00,abc124,Transferência enviada pelo Pix - BEAUTY COLOR LTDA
05/06/2026,120.00,abc125,Transferência recebida pelo Pix - ANA SOUZA
07/06/2026,-89.90,abc126,Pagamento de boleto - VIVO`;

const SAMPLE_CSV_INTER = `Data Lancamento;Historico;Descricao;Valor;Saldo
01/06/2026;PIX RECEBIDO;Pix de Maria Silva;80,00;1080,00
03/06/2026;PIX ENVIADO;Pix para Beauty Color;-300,00;780,00`;

console.log('=== TESTE OFX ===');
const ofxResult = parseOfx(SAMPLE_OFX);
console.log(`Banco detectado: ${ofxResult.bank}`);
console.log(`Transacoes: ${ofxResult.transactions.length}`);
ofxResult.transactions.forEach((tx, i) => {
  console.log(`  ${i + 1}. ${tx.date.toLocaleDateString('pt-BR')} | ${tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)} | ${tx.contraparte ?? '-'} | ${tx.description.slice(0, 50)}`);
});

console.log('\n=== TESTE CSV NUBANK ===');
const csvNubank = parseCsv(SAMPLE_CSV_NUBANK);
console.log(`Banco detectado: ${csvNubank.bank}`);
console.log(`Transacoes: ${csvNubank.transactions.length}`);
csvNubank.transactions.forEach((tx, i) => {
  console.log(`  ${i + 1}. ${tx.date.toLocaleDateString('pt-BR')} | ${tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)} | ${tx.description.slice(0, 50)}`);
});

console.log('\n=== TESTE CSV INTER ===');
const csvInter = parseCsv(SAMPLE_CSV_INTER);
console.log(`Banco detectado: ${csvInter.bank}`);
console.log(`Transacoes: ${csvInter.transactions.length}`);
csvInter.transactions.forEach((tx, i) => {
  console.log(`  ${i + 1}. ${tx.date.toLocaleDateString('pt-BR')} | ${tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)} | ${tx.description.slice(0, 50)}`);
});

console.log('\n=== TESTE DETECT FORMAT ===');
console.log(`extrato.ofx -> ${detectFormat('extrato.ofx', Buffer.from(SAMPLE_OFX))}`);
console.log(`extrato.csv -> ${detectFormat('extrato.csv', Buffer.from(SAMPLE_CSV_NUBANK))}`);
console.log(`unknown.txt (OFX content) -> ${detectFormat('unknown.txt', Buffer.from(SAMPLE_OFX))}`);
console.log(`unknown.txt (CSV content) -> ${detectFormat('unknown.txt', Buffer.from(SAMPLE_CSV_NUBANK))}`);
