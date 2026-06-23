import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso — Grana',
  description: 'Termos de uso do Grana. Sem letra miuda escondida.',
};

/**
 * Termos de uso do Grana.
 *
 * Tom: direto e humano, sem juridiques. Cobre o minimo legal pra
 * operar uma assinatura SaaS no Brasil:
 *  - quem somos
 *  - o que o servico faz
 *  - como funciona o pagamento (free, trial, pro)
 *  - cancelamento e reembolso
 *  - responsabilidade (a gente nao faz contabilidade, so ajuda a usuaria)
 *  - propriedade dos dados
 *  - alteracoes nos termos
 *  - foro
 *
 * Atualizar a `dataAtualizacao` toda vez que mudar algo material.
 */
export default function TermosPage() {
  const dataAtualizacao = '23 de junho de 2026';

  return (
    <main className="min-h-screen bg-white">
      {/* Header simples */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-extrabold text-white">Grana</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-white/80 hover:text-white"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 py-10 prose prose-slate">
        <h1 className="text-3xl font-extrabold mb-2">Termos de Uso</h1>
        <p className="text-sm text-slate-500 mb-8">
          Última atualização: {dataAtualizacao}
        </p>

        <div className="space-y-6 text-slate-700 leading-relaxed">
          <section>
            <p>
              Esses termos explicam o que você pode esperar do Grana e o
              que a gente espera de quem usa. Linguagem simples de
              propósito. Se alguma coisa não tiver clara, manda e-mail
              que a gente explica: <strong>contato@grana.app</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              1. Quem somos
            </h2>
            <p>
              O Grana é um aplicativo web e PWA pra controle financeiro
              de profissionais autônomas e MEIs. A gente ajuda a
              entender quanto entra, quanto sai e quanto sobra de
              verdade no fim do mês.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              2. O que o Grana faz
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Importa extratos bancários (PDF, CSV, OFX) e categoriza com IA.</li>
              <li>Mostra dashboard de receitas, despesas e saúde do negócio.</li>
              <li>Calcula DAS-MEI, controla Simples Nacional e alerta limites.</li>
              <li>Gera recibos, controla clientes e envia lembretes por e-mail.</li>
              <li>Exporta relatórios pra você ou pro seu contador.</li>
            </ul>
            <p className="mt-3">
              <strong>O que o Grana NÃO é:</strong> não somos contadores
              nem contadora. Nossas sugestões de imposto, regime
              tributário e reservas são <strong>auxílio</strong>, não
              substituem orientação contábil profissional. Decisões
              fiscais finais são responsabilidade sua e do seu contador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              3. Como funciona a conta
            </h2>
            <p>
              Ao criar conta no Grana você concorda com estes termos e
              com nossa{' '}
              <Link href="/privacidade" className="text-violet-600 underline">
                Política de Privacidade
              </Link>
              . Você é responsável por manter sua senha em segurança e
              por tudo que acontece na sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              4. Planos e pagamento
            </h2>
            <p>
              O Grana tem um plano <strong>Free</strong> com limite de
              20 transações novas por mês e um plano{' '}
              <strong>Pro</strong> com tudo liberado.
            </p>
            <p className="mt-3">
              Toda conta nova ganha <strong>7 dias de Pro grátis</strong>{' '}
              automaticamente, sem cadastro de cartão. Quando o trial
              acaba, você volta pro Free, sem cobrança surpresa.
            </p>
            <p className="mt-3">
              O Pro custa <strong>R$ 19,90/mês</strong>, cobrado pela
              Stripe (Stripe Payments do Brasil). A renovação é
              automática no mesmo dia do mês seguinte. Os preços podem
              mudar com aviso prévio de 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              5. Cancelamento e reembolso
            </h2>
            <p>
              Você pode cancelar a qualquer momento direto no app
              (Perfil → Gerenciar assinatura). Sem multa, sem ligação,
              sem chat de retenção. Após cancelar, o Pro continua ativo
              até o fim do período já pago.
            </p>
            <p className="mt-3">
              <strong>Reembolso:</strong> nos primeiros 7 dias do
              primeiro pagamento, devolução integral mediante pedido por
              e-mail. Após esse período, não fazemos reembolso de
              períodos parciais já consumidos. CDC art. 49 (direito de
              arrependimento) é respeitado para a primeira contratação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              6. Seus dados são seus
            </h2>
            <p>
              Tudo que você lança no Grana (transações, clientes,
              recibos) é seu. A gente armazena de forma segura mas você
              pode <strong>exportar tudo</strong> e{' '}
              <strong>apagar a conta</strong> quando quiser. Detalhes
              completos na{' '}
              <Link href="/privacidade" className="text-violet-600 underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              7. Uso aceitável
            </h2>
            <p>
              Você não pode usar o Grana pra atividades ilegais, lavagem
              de dinheiro, sonegação fiscal ou pra atacar nossa
              infraestrutura. Reservamos o direito de suspender contas
              que violem isso, com aviso e oportunidade de exportar os
              dados antes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              8. Limite de responsabilidade
            </h2>
            <p>
              O Grana é fornecido &quot;como está&quot;. Fazemos o máximo pra
              manter o serviço estável e os cálculos corretos, mas não
              garantimos disponibilidade 100% nem que decisões tomadas
              com base nos relatórios sejam acertadas. Em nenhuma
              hipótese nossa responsabilidade ultrapassará o valor pago
              por você nos últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              9. Mudanças nos termos
            </h2>
            <p>
              A gente pode atualizar esses termos. Quando for mudança
              relevante, avisa por e-mail com no mínimo 30 dias de
              antecedência. Se você não concordar, pode cancelar sem
              custo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              10. Foro
            </h2>
            <p>
              Esses termos seguem a lei brasileira. Eventuais disputas
              são resolvidas no foro do domicílio do consumidor (CDC).
            </p>
          </section>

          <section className="mt-10 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Dúvida sobre esses termos? Manda e-mail pra{' '}
              <strong>contato@grana.app</strong>. Resposta em até 2 dias
              úteis.
            </p>
          </section>
        </div>
      </article>

      <footer className="border-t border-slate-200 mt-10 py-6">
        <div className="max-w-3xl mx-auto px-5 flex justify-between text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-900">← Voltar pro início</Link>
          <Link href="/privacidade" className="hover:text-slate-900">Privacidade →</Link>
        </div>
      </footer>
    </main>
  );
}
