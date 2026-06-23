import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Grana',
  description: 'Como o Grana trata seus dados pessoais e financeiros.',
};

/**
 * Politica de Privacidade do Grana (LGPD).
 *
 * Cobre os pontos exigidos pela LGPD (Lei 13.709/2018):
 *  - quais dados coletamos
 *  - pra que (finalidade) e base legal
 *  - com quem compartilhamos (subprocessadores)
 *  - direitos do titular
 *  - retencao e seguranca
 *  - cookies
 *  - contato do encarregado (DPO)
 *
 * Atualizar `dataAtualizacao` quando mudar processamento/subprocessador.
 */
export default function PrivacidadePage() {
  const dataAtualizacao = '23 de junho de 2026';

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-extrabold text-white">Grana</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-white/80 hover:text-white">
            ← Voltar
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-extrabold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-slate-500 mb-8">
          Última atualização: {dataAtualizacao}
        </p>

        <div className="space-y-6 text-slate-700 leading-relaxed">
          <section>
            <p>
              Seus dados financeiros são sensíveis. A gente leva isso a
              sério. Esta política explica em português claro tudo que
              fazemos com suas informações — e o que você pode exigir
              da gente a qualquer momento. Tudo seguindo a LGPD (Lei
              13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              1. Quem é o controlador
            </h2>
            <p>
              O Grana é o controlador dos seus dados pessoais. Pra
              qualquer dúvida ou solicitação relacionada a privacidade,
              o canal direto é <strong>privacidade@grana.app</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              2. Que dados a gente coleta
            </h2>
            <p className="font-semibold mt-3">Você nos fornece:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Nome, e-mail e senha (para criar conta)</li>
              <li>Profissão, regime tributário (MEI/Simples) e dados do contador (opcional)</li>
              <li>Transações financeiras (lançadas manualmente ou importadas de PDF/CSV/OFX)</li>
              <li>Dados de clientes que você cadastra pra emitir recibos</li>
              <li>Dados de pagamento (processados pela Stripe, não armazenamos cartão)</li>
            </ul>

            <p className="font-semibold mt-4">Coletamos automaticamente:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Logs de acesso (IP, user-agent, timestamp) pra segurança</li>
              <li>Cookies essenciais pra manter você logada</li>
              <li>Eventos de uso anonimizados pra entender o que funciona</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              3. Pra que usamos seus dados (finalidade)
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Operar o serviço:</strong> mostrar dashboard, calcular DAS, gerar relatórios</li>
              <li><strong>Cobrar:</strong> processar pagamento de assinatura Pro</li>
              <li><strong>Comunicar:</strong> enviar lembretes (DAS vencendo, relatórios mensais)</li>
              <li><strong>Melhorar:</strong> entender quais funcionalidades importam mais</li>
              <li><strong>Suporte:</strong> responder dúvidas e resolver problemas</li>
            </ul>
            <p className="mt-3 text-sm text-slate-600">
              Base legal LGPD: execução de contrato (art. 7º, V), legítimo
              interesse pra segurança e analytics (art. 7º, IX), consentimento
              pra marketing (se houver).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              4. Quem mais vê seus dados
            </h2>
            <p>
              Nunca vendemos ou alugamos seus dados. A gente compartilha
              apenas com prestadores que ajudam o serviço a funcionar
              (subprocessadores), sob contrato e dever de
              confidencialidade:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-3">
              <li><strong>Vercel</strong> — hospedagem do aplicativo (EUA, com adequação LGPD)</li>
              <li><strong>Supabase / Neon</strong> — banco de dados (EUA/EU)</li>
              <li><strong>Stripe</strong> — processamento de pagamentos (EUA, certificada)</li>
              <li><strong>Anthropic (Claude)</strong> — IA pra categorizar transações (não treinamos modelo com seus dados)</li>
              <li><strong>Resend</strong> — envio de e-mails transacionais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              5. Quanto tempo guardamos
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Conta ativa: enquanto você usa o serviço.</li>
              <li>Conta cancelada: 30 dias pra você reativar, depois apagamos.</li>
              <li>Dados fiscais (recibos, relatórios): 5 anos após cancelamento, prazo legal mínimo.</li>
              <li>Logs de segurança: 6 meses.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              6. Seus direitos (LGPD)
            </h2>
            <p>Você pode, a qualquer momento, exigir:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Acesso:</strong> ver todos os dados que temos sobre você</li>
              <li><strong>Correção:</strong> ajustar dados desatualizados</li>
              <li><strong>Exclusão:</strong> apagar sua conta e dados (Perfil → Excluir conta)</li>
              <li><strong>Portabilidade:</strong> exportar tudo em CSV/JSON</li>
              <li><strong>Informação:</strong> saber com quem compartilhamos</li>
              <li><strong>Revogação:</strong> retirar consentimento de comunicações</li>
            </ul>
            <p className="mt-3">
              Pra exercer qualquer um, manda e-mail pra{' '}
              <strong>privacidade@grana.app</strong>. Resposta em até 15
              dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              7. Segurança
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Senhas armazenadas com hash bcrypt (nunca em texto puro)</li>
              <li>Conexões HTTPS/TLS em todas as páginas</li>
              <li>Banco de dados criptografado em repouso</li>
              <li>Pagamentos processados diretamente pela Stripe (PCI-DSS Nível 1)</li>
              <li>Backups diários automáticos</li>
            </ul>
            <p className="mt-3">
              Caso ocorra incidente que afete seus dados, avisamos por
              e-mail em até 48h e à ANPD conforme exige a LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              8. Cookies
            </h2>
            <p>
              Usamos cookies <strong>essenciais</strong> pra te manter
              logada (cookie de sessão) e cookies <strong>analíticos</strong>{' '}
              pra entender uso agregado. Não usamos cookies de
              publicidade nem rastreamento entre sites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              9. Crianças
            </h2>
            <p>
              O Grana é destinado a maiores de 18 anos. Não coletamos
              conscientemente dados de menores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">
              10. Mudanças na política
            </h2>
            <p>
              Quando atualizamos esta política de forma material,
              avisamos por e-mail com 30 dias de antecedência. Mudanças
              menores (correção de redação) entram em vigor na data de
              atualização acima.
            </p>
          </section>

          <section className="mt-10 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Encarregado de Dados (DPO): <strong>privacidade@grana.app</strong>
              <br />
              Você também pode reclamar diretamente à{' '}
              <a
                href="https://www.gov.br/anpd/pt-br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 underline"
              >
                ANPD
              </a>
              .
            </p>
          </section>
        </div>
      </article>

      <footer className="border-t border-slate-200 mt-10 py-6">
        <div className="max-w-3xl mx-auto px-5 flex justify-between text-sm text-slate-500">
          <Link href="/termos" className="hover:text-slate-900">← Termos</Link>
          <Link href="/" className="hover:text-slate-900">Voltar pro início →</Link>
        </div>
      </footer>
    </main>
  );
}
