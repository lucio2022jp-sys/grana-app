import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Landing page do Grana.
 *
 * Estrategia de copy:
 *  - Hero: gancho emocional ("ganha de verdade") + diferenciacao ("sem
 *    decorar nada")
 *  - Dores (3): cada uma e uma frase real que MEI pensa, em primeira pessoa
 *  - Features com prints "fake" do app: cada print esta dentro de um card
 *    pra o MEI ver o produto sem precisar logar
 *  - Pricing: Free + Pro R$ 17,90, com 7 dias gratis
 *  - FAQ: as perguntas que MEI realmente faz
 *  - CTA: tres oportunidades (hero, depois das features, depois do pricing)
 *
 * Visual: usa o design system do app (gradientes, emojis, rounded-3xl,
 * shadow-glow-cool). Mobile-first como o app inteiro.
 */
export default async function HomePage() {
  // Se ja tem sessao com transacoes, vai direto pro app
  const uid = cookies().get('grana_uid')?.value;
  if (uid) {
    try {
      const count = await prisma.transaction.count({ where: { userId: uid } });
      if (count > 0) redirect('/app');
    } catch (e) {
      if (e && typeof e === 'object' && 'digest' in e) throw e;
      console.error('[HomePage] erro consultando transactions:', e);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header fixo simples */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-extrabold text-gray-900">Grana</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-semibold text-gray-700 hover:text-secondary-600 px-3 py-1.5"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="text-sm font-bold bg-gray-900 text-white px-4 py-2 rounded-full hover:scale-105 active:scale-95 transition"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative bg-gradient-hero overflow-hidden">
        <div className="absolute top-10 left-6 text-5xl animate-float opacity-90" aria-hidden>💰</div>
        <div className="absolute top-20 right-8 text-4xl animate-float-slow opacity-80" aria-hidden>📊</div>
        <div className="absolute top-40 left-10 text-3xl animate-float opacity-70" aria-hidden>✨</div>
        <div className="absolute bottom-32 right-6 text-5xl animate-float-slow opacity-80" aria-hidden>💸</div>

        <div className="max-w-4xl mx-auto px-5 py-16 md:py-24 text-center relative z-10">
          <div className="inline-block bg-white/80 backdrop-blur-sm border border-white rounded-full px-4 py-1.5 mb-6 shadow-soft">
            <span className="text-xs font-semibold text-secondary-600">
              ✨ Pra MEI dormir tranquilo
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-4 leading-tight">
            Saiba quanto voce<br />
            <span className="bg-gradient-to-r from-secondary-600 to-accent-pink bg-clip-text text-transparent">
              ganha de verdade
            </span>
          </h1>

          <p className="text-gray-700 text-lg md:text-xl font-medium mb-8 max-w-xl mx-auto">
            DAS, notas, reserva pra imposto, faturamento.
            Tudo organizado num lugar so. Direto no celular.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Link
              href="/signup"
              className="bg-gradient-cool text-white font-bold py-4 px-8 rounded-full shadow-glow-cool hover:scale-105 active:scale-95 transition text-center text-lg"
            >
              Começar grátis 🚀
            </Link>
            <Link
              href="/demo"
              className="bg-white border-2 border-secondary-200 text-secondary-700 font-bold py-4 px-8 rounded-full hover:scale-105 active:scale-95 transition text-center"
            >
              Ver demonstração
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            7 dias grátis · Sem cartão de crédito · Cancele quando quiser
          </p>

          {/* Social proof */}
          <div className="mt-10 inline-flex items-center gap-3 bg-white/60 backdrop-blur rounded-full px-4 py-2 shadow-soft">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-accent-pink flex items-center justify-center text-xs">👩</div>
              <div className="w-7 h-7 rounded-full bg-accent-yellow flex items-center justify-center text-xs">🧑</div>
              <div className="w-7 h-7 rounded-full bg-accent-green flex items-center justify-center text-xs">👨</div>
            </div>
            <span className="text-xs text-gray-700 font-medium">+1.000 autônomos no controle</span>
          </div>
        </div>
      </section>

      {/* DORES */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              Voce reconhece isso?
            </h2>
            <p className="text-gray-600 text-lg">
              A vida real do MEI antes de descobrir o Grana.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <DorCard
              emoji="😰"
              titulo='"Esqueci de pagar o DAS de novo"'
              detalhe="Vem multa, juros, certidao negativa nega. CNPJ irregular sem voce ver."
            />
            <DorCard
              emoji="😵"
              titulo='"Nao sei quanto guardar pra imposto"'
              detalhe="Quando vem cobranca da Receita, voce ja gastou tudo."
            />
            <DorCard
              emoji="🤯"
              titulo='"Misturo dinheiro pessoal com da empresa"'
              detalhe="Ja nao sei mais quanto eu lucro de verdade no fim do mes."
            />
          </div>

          {/* Quizzinho */}
          <div className="mt-12 bg-gradient-to-br from-amber-50 to-pink-50 border-2 border-amber-200 rounded-3xl p-6 md:p-8">
            <h3 className="font-extrabold text-gray-900 text-xl mb-4 text-center">
              Responde rapido pra voce mesma:
            </h3>
            <ul className="space-y-3 max-w-xl mx-auto">
              <Pergunta>Quanto voce faturou esse mes? E ano passado inteiro?</Pergunta>
              <Pergunta>Esta perto do teto MEI? Vai estourar?</Pergunta>
              <Pergunta>Tem 5 receitas sem nota fiscal emitida ai?</Pergunta>
              <Pergunta>Ja entregou a DASN do ano passado?</Pergunta>
            </ul>
            <p className="text-center text-sm text-gray-700 mt-5 font-medium">
              Se voce respondeu &quot;nao sei&quot; em pelo menos 2,
              <br className="hidden sm:inline" /> o Grana foi feito pra voce.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES com "prints" */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              Tudo que MEI precisa em 1 app
            </h2>
            <p className="text-gray-600 text-lg">
              Sem planilha. Sem decorar nada. Sem dor de cabeça.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <FeatureCard
              emoji="🔍"
              titulo="Checkup completo"
              detalhe="Verde, amarelo, vermelho — entende seu status fiscal e financeiro em 5 segundos."
              previewBg="bg-gradient-cool"
              previewContent={
                <div className="text-white">
                  <div className="text-3xl mb-1">🟢</div>
                  <div className="font-bold text-sm">Tudo em ordem</div>
                  <div className="text-xs opacity-90">5 verde · 1 amarelo</div>
                </div>
              }
            />
            <FeatureCard
              emoji="💎"
              titulo="Quanto sobrou pra voce"
              detalhe="Receita menos despesas menos pro-labore. O numero que importa."
              previewBg="bg-gradient-cool"
              previewContent={
                <div className="text-white">
                  <div className="text-xs opacity-90 mb-1">Sobrou pra voce 💎</div>
                  <div className="text-3xl font-extrabold">R$ 2.340</div>
                </div>
              }
            />
            <FeatureCard
              emoji="📋"
              titulo="DAS e DASN sem esquecer"
              detalhe="Lembrete antes do vencimento. DASN com os 2 numeros prontos pra colar no portal."
              previewBg="bg-gradient-warning"
              previewContent={
                <div className="text-orange-900">
                  <div className="text-xs font-bold uppercase tracking-wide">DAS</div>
                  <div className="font-bold text-sm">Vence em 4 dias</div>
                  <div className="text-2xl font-extrabold mt-1">R$ 80,90</div>
                </div>
              }
            />
            <FeatureCard
              emoji="🧾"
              titulo="Recibo no WhatsApp"
              detalhe="Cliente paga, voce gera recibo PDF no app e manda direto pra ele em 15 segundos."
              previewBg="bg-gradient-pink"
              previewContent={
                <div className="text-white">
                  <div className="text-xs opacity-90">Recibo pra Maria Silva</div>
                  <div className="font-bold text-sm">Manicure - kit completo</div>
                  <div className="text-2xl font-extrabold mt-1">R$ 80,00</div>
                </div>
              }
            />
            <FeatureCard
              emoji="📸"
              titulo="Foto da nota = transacao"
              detalhe="Tira foto do cupom ou nota, IA classifica automatico. Sem digitar nada."
              previewBg="bg-gradient-money"
              previewContent={
                <div className="text-white">
                  <div className="text-xs opacity-90">📸 Nota lida</div>
                  <div className="font-bold text-sm">Esmalte risque</div>
                  <div className="text-xs mt-1">categoria: produto</div>
                  <div className="text-2xl font-extrabold mt-1">R$ 12,90</div>
                </div>
              }
            />
            <FeatureCard
              emoji="🐷"
              titulo="Reserva automatica"
              detalhe="A cada receita, sugere quanto guardar pra imposto. Voce nao e pega de surpresa."
              previewBg="bg-gradient-money"
              previewContent={
                <div className="text-white">
                  <div className="text-xs opacity-90 mb-1">🐷 Reservado esse mes</div>
                  <div className="text-3xl font-extrabold">R$ 156</div>
                  <div className="text-xs opacity-90 mt-1">de R$ 200 sugeridos</div>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* CTA INTERMEDIARIO */}
      <section className="bg-white py-12">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <Link
            href="/signup"
            className="inline-block bg-gradient-cool text-white font-bold py-4 px-10 rounded-full shadow-glow-cool hover:scale-105 active:scale-95 transition text-lg"
          >
            Quero organizar meu MEI →
          </Link>
        </div>
      </section>

      {/* PRICING */}
      <section id="precos" className="bg-gradient-to-b from-white to-gray-50 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              Preço justo pra MEI
            </h2>
            <p className="text-gray-600 text-lg">
              Comece grátis. Pague só se valer a pena pra você.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 md:p-8 flex flex-col">
              <h3 className="text-xl font-extrabold text-gray-900">Grátis</h3>
              <div className="mt-3 mb-1">
                <span className="text-5xl font-extrabold text-gray-900">R$ 0</span>
                <span className="text-gray-500">/sempre</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">Pra começar a se organizar.</p>

              <ul className="space-y-2 text-sm text-gray-700 mb-6 flex-1">
                <Feat>Ate 30 transacoes/mes</Feat>
                <Feat>Dashboard com lucro real</Feat>
                <Feat>Lembrete de DAS</Feat>
                <Feat>DASN-SIMEI guiada</Feat>
                <Feat>Importar extrato Pix</Feat>
              </ul>

              <Link
                href="/signup"
                className="block text-center bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-800 font-bold py-3 rounded-2xl transition active:scale-95"
              >
                Começar grátis
              </Link>
            </div>

            {/* Pro - destacado */}
            <div className="relative bg-gradient-cool text-white rounded-3xl p-6 md:p-8 flex flex-col shadow-glow-cool">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-yellow text-amber-900 text-xs font-extrabold px-3 py-1 rounded-full">
                ⭐ MAIS POPULAR
              </div>
              <h3 className="text-xl font-extrabold">Pro</h3>
              <div className="mt-3 mb-1">
                <span className="text-5xl font-extrabold">R$ 17,90</span>
                <span className="opacity-80">/mes</span>
              </div>
              <p className="text-sm opacity-90 mb-6">
                Ou R$ 179/ano (economiza R$ 35).
              </p>

              <ul className="space-y-2 text-sm mb-6 flex-1">
                <Feat light>Tudo do Gratis</Feat>
                <Feat light><strong>Transacoes ilimitadas</strong></Feat>
                <Feat light>Foto da nota com IA</Feat>
                <Feat light>Recibo PDF + WhatsApp</Feat>
                <Feat light>Relatorio mensal automatico</Feat>
                <Feat light>Reserva de imposto auto</Feat>
                <Feat light>Historico DASN com PDF</Feat>
                <Feat light>Cadastro de clientes</Feat>
              </ul>

              <Link
                href="/signup"
                className="block text-center bg-white text-secondary-700 font-extrabold py-3 rounded-2xl hover:scale-105 active:scale-95 transition"
              >
                Comecar 7 dias gratis
              </Link>
              <p className="text-xs opacity-80 text-center mt-2">
                Sem cartao de credito
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            🛡️ Garantia: cancele quando quiser. Seus dados sao seus.
          </p>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              Quem usa fala
            </h2>
            <p className="text-gray-600 text-lg">MEIs reais, profissoes diferentes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Depoimento
              foto="👩"
              nome="Mariana"
              profissao="Manicure · SP"
              texto="Antes eu achava que tava ganhando bem. Quando vi o app, descobri que tava gastando mais do que ganhava em coisa pessoal. Mudou meu jeito de gerir."
            />
            <Depoimento
              foto="🧑"
              nome="Carlos"
              profissao="Motorista app · PR"
              texto="O lembrete de DAS me salvou ja 3 vezes. Eu esquecia toda vez e pagava com multa. Agora chega o aviso e eu pago no dia."
            />
            <Depoimento
              foto="👨"
              nome="Bruno"
              profissao="Designer freela · BH"
              texto="A foto da nota com IA é genial. Eu so fotografo o cupom da gasolina e ja entra como despesa dedutivel. Em 1 segundo."
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              Perguntas frequentes
            </h2>
          </div>

          <div className="space-y-3">
            <FAQItem
              q="Eu preciso de contador pra usar o Grana?"
              a="Nao. O app foi feito pra MEI puro, que tem obrigacoes simples (DAS mensal e DASN anual). Se voce sair do MEI ou virar Simples Nacional, ai sim recomenda contador — e a gente tem parceiros pra te indicar."
            />
            <FAQItem
              q="O app substitui contador?"
              a="Pra MEI puro, sim — voce mesma cumpre tudo. Pra outros regimes (Simples, Lucro Presumido), o Grana ajuda a se organizar mas voce ainda precisa de contador. A gente foi feito pra MEI."
            />
            <FAQItem
              q="Funciona se eu nao tenho CNPJ ainda?"
              a="Sim. Voce pode usar o app pra organizar sua grana antes de virar MEI. Quando virar, a gente te avisa do DAS, DASN e teto."
            />
            <FAQItem
              q="Os calculos sao oficiais?"
              a="Sao estimativas baseadas nas suas transacoes. O app organiza pra voce ter clareza, mas a fonte oficial e sempre o portal da Receita / portal do MEI. Antes de declarar, sempre confira por la."
            />
            <FAQItem
              q="Meus dados ficam seguros?"
              a="Sim. Tudo criptografado, banco de dados protegido, foto de comprovante em URL temporaria que expira em 5 minutos. Nao vendemos seus dados pra ninguem."
            />
            <FAQItem
              q="Posso usar pelo celular?"
              a="Sim, o app foi feito pensado primeiro pro celular. Da pra instalar como aplicativo no Android e iPhone (PWA)."
            />
            <FAQItem
              q="Posso cancelar quando quiser?"
              a="Sim. Sem multa, sem fidelidade, sem precisar ligar. Cancela direto no app."
            />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-gradient-cool text-white py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
            Cada mes sem organizar
            <br />é dinheiro sumindo.
          </h2>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            Comece grátis hoje. Em 5 minutos voce ja sabe quanto sobra de verdade.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-secondary-700 font-extrabold py-4 px-10 rounded-full hover:scale-105 active:scale-95 transition text-lg shadow-2xl"
          >
            Criar conta grátis 🚀
          </Link>
          <p className="text-xs opacity-80 mt-4">
            7 dias gratis no Pro · Sem cartao · Cancele quando quiser
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <span className="font-extrabold text-white">Grana</span>
              <span className="text-xs ml-2">© 2026</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/login" className="hover:text-white">Entrar</Link>
              <Link href="/signup" className="hover:text-white">Criar conta</Link>
              <Link href="/demo" className="hover:text-white">Ver demonstração</Link>
              <a href="mailto:contato@grana.app" className="hover:text-white">Contato</a>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-8 text-center">
            Grana e um app de organizacao financeira. Nao substitui orientacao
            contabil ou juridica profissional.
          </p>
        </div>
      </footer>
    </main>
  );
}

// =============== Componentes auxiliares ===============

function DorCard({ emoji, titulo, detalhe }: { emoji: string; titulo: string; detalhe: string }) {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 hover:border-secondary-200 hover:shadow-soft transition">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="font-extrabold text-gray-900 mb-2 leading-tight">{titulo}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{detalhe}</p>
    </div>
  );
}

function Pergunta({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-gray-800">
      <span className="text-xl shrink-0">❓</span>
      <span className="text-sm md:text-base">{children}</span>
    </li>
  );
}

function FeatureCard({
  emoji,
  titulo,
  detalhe,
  previewBg,
  previewContent,
}: {
  emoji: string;
  titulo: string;
  detalhe: string;
  previewBg: string;
  previewContent: React.ReactNode;
}) {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 hover:shadow-soft transition">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">{emoji}</span>
        <div>
          <h3 className="font-extrabold text-gray-900 leading-tight mb-1">{titulo}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{detalhe}</p>
        </div>
      </div>
      {/* "Print" do app */}
      <div className={`${previewBg} rounded-2xl p-4 shadow-soft`}>
        {previewContent}
      </div>
    </div>
  );
}

function Feat({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <span className={light ? 'text-white' : 'text-emerald-600'}>✓</span>
      <span>{children}</span>
    </li>
  );
}

function Depoimento({
  foto,
  nome,
  profissao,
  texto,
}: {
  foto: string;
  nome: string;
  profissao: string;
  texto: string;
}) {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-3xl p-6">
      <p className="text-sm text-gray-700 italic mb-4 leading-relaxed">
        &ldquo;{texto}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent-pink flex items-center justify-center text-xl">
          {foto}
        </div>
        <div>
          <div className="font-bold text-gray-900 text-sm">{nome}</div>
          <div className="text-xs text-gray-500">{profissao}</div>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group bg-white border border-gray-200 rounded-2xl p-5 hover:border-secondary-200 transition">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
        <h3 className="font-bold text-gray-900 text-sm md:text-base">{q}</h3>
        <span className="text-gray-400 text-xl transition-transform group-open:rotate-45">＋</span>
      </summary>
      <p className="text-sm text-gray-600 mt-3 leading-relaxed">{a}</p>
    </details>
  );
}
