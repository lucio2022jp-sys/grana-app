import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Landing v2 do Grana.
 *
 * Direcao visual:
 *  - Hero ESCURO (preto + gradientes radiais roxo/azul) com mockup de celular
 *    em HTML mostrando o dashboard real. Glow e bordas com gradiente.
 *  - Body CLARO premium (cards com glass sutil, bordas com gradiente, shadow-soft).
 *  - CTA final ESCURO pra fechar com peso.
 *  - Limite Free: 20 transacoes/mes (estoura no 1o mes => conversao).
 *
 * Referencias: Linear, Vercel, Cal.com.
 */
export default async function HomePage() {
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
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-extrabold text-white">Grana</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-semibold text-white/80 hover:text-white px-3 py-1.5"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-white bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 px-4 py-2 rounded-full shadow-[0_8px_24px_-8px_rgba(168,85,247,0.6)]"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ESCURO ============ */}
      <section className="relative overflow-hidden bg-black text-white">
        {/* Camadas de glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] bg-gradient-radial from-violet-600/30 via-fuchsia-600/10 to-transparent blur-3xl rounded-full" style={{background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(236,72,153,0.12) 35%, transparent 70%)'}}/>
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl" style={{background: 'radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)'}}/>
          <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl" style={{background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)'}}/>
        </div>

        {/* Grid sutil de fundo */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}/>

        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-24 md:pt-24 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
          {/* Coluna esquerda — texto */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/80 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              Pra MEI que quer parar de adivinhar
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
              Quanto você
              <br/>
              <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                ganha de verdade?
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 mb-8 max-w-xl leading-relaxed">
              Você reconhece isso: o dinheiro entra, mas no fim do mês some.
              O <span className="text-white font-semibold">Grana</span> mostra
              quanto sobra de verdade — depois do imposto, do material e da conta de luz.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-white text-black font-bold px-6 py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition shadow-[0_20px_60px_-12px_rgba(255,255,255,0.4)]"
              >
                Começar grátis
                <span>→</span>
              </Link>
              <a
                href="#precos"
                className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/20 backdrop-blur-sm text-white font-semibold px-6 py-4 rounded-2xl hover:bg-white/10 transition"
              >
                Ver preços
              </a>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> 7 dias grátis
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Sem cartão
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Cancela quando quiser
              </div>
            </div>
          </div>

          {/* Coluna direita — mockup de celular */}
          <div className="relative flex justify-center md:justify-end">
            {/* Glow atras do celular */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[400px] h-[400px] rounded-full blur-3xl" style={{background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(236,72,153,0.2) 40%, transparent 70%)'}}/>
            </div>

            {/* Frame do celular */}
            <div className="relative w-[300px] md:w-[340px] aspect-[9/19] rounded-[3rem] bg-gradient-to-b from-zinc-800 to-zinc-900 p-3 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] border border-white/10">
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-10"/>

              {/* Tela do app */}
              <div className="w-full h-full bg-gradient-to-b from-slate-50 to-white rounded-[2.3rem] overflow-hidden flex flex-col">
                {/* Status bar fake */}
                <div className="px-6 pt-2 pb-1 flex justify-between items-center text-[10px] font-semibold text-gray-900">
                  <span>9:41</span>
                  <span className="flex gap-1 items-center">
                    <span>●●●●</span>
                    <span>📶</span>
                    <span>🔋</span>
                  </span>
                </div>

                {/* Conteudo do dashboard */}
                <div className="flex-1 overflow-hidden px-4 pt-8 pb-3 space-y-3">
                  {/* Saudacao */}
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[10px] text-gray-500 font-medium">Oi, Camila 👋</div>
                      <div className="text-base font-extrabold text-gray-900">Junho 2026</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500"/>
                  </div>

                  {/* Card destaque — sobrou */}
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 text-white shadow-lg">
                    <div className="text-[10px] font-semibold opacity-90 mb-1">SOBROU PRA VOCÊ</div>
                    <div className="text-2xl font-extrabold tracking-tight">R$ 2.340,80</div>
                    <div className="text-[10px] opacity-90 mt-1 flex items-center gap-1">
                      <span>↑</span> +18% vs maio
                    </div>
                  </div>

                  {/* Mini-cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl p-2.5 bg-emerald-50 border border-emerald-100">
                      <div className="text-[9px] text-emerald-700 font-semibold">ENTROU</div>
                      <div className="text-sm font-extrabold text-emerald-900">R$ 4.820</div>
                    </div>
                    <div className="rounded-xl p-2.5 bg-orange-50 border border-orange-100">
                      <div className="text-[9px] text-orange-700 font-semibold">SAIU</div>
                      <div className="text-sm font-extrabold text-orange-900">R$ 2.479</div>
                    </div>
                  </div>

                  {/* Alerta DAS */}
                  <div className="rounded-xl p-2.5 bg-amber-50 border border-amber-200 flex items-center gap-2">
                    <span className="text-base">⏰</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-amber-900">DAS vence em 4 dias</div>
                      <div className="text-[9px] text-amber-700">R$ 75,90 — clica pra pagar</div>
                    </div>
                  </div>

                  {/* Alerta MEI */}
                  <div className="rounded-xl p-2.5 bg-blue-50 border border-blue-200">
                    <div className="text-[10px] font-bold text-blue-900 flex items-center gap-1">
                      <span>📊</span> Limite MEI 2026
                    </div>
                    <div className="mt-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full w-[42%] bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"/>
                    </div>
                    <div className="text-[9px] text-blue-700 mt-1">R$ 34.200 / R$ 81.000 (tranquilo)</div>
                  </div>

                  {/* Lista mini de transacoes */}
                  <div className="space-y-1.5">
                    <div className="text-[9px] uppercase tracking-wide text-gray-500 font-bold">Hoje</div>
                    <div className="bg-white rounded-xl p-2 border border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">💅</span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-gray-900 truncate">Maria — alongamento</div>
                          <div className="text-[9px] text-gray-500">cliente</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-extrabold text-emerald-600">+R$ 180</div>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">🛒</span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-gray-900 truncate">Beauty Color — esmaltes</div>
                          <div className="text-[9px] text-gray-500">produto</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-extrabold text-gray-900">R$ 89</div>
                    </div>
                  </div>
                </div>

                {/* Tab bar */}
                <div className="border-t border-gray-100 px-3 py-2 flex justify-around bg-white">
                  <span className="text-base">🏠</span>
                  <span className="text-base opacity-40">💸</span>
                  <span className="text-base opacity-40">📊</span>
                  <span className="text-base opacity-40">👤</span>
                </div>
              </div>
            </div>

            {/* Badge flutuante "ao vivo" */}
            <div className="absolute -top-4 -right-4 md:-right-12 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-emerald-500/40 rotate-3">
              ao vivo
            </div>
          </div>
        </div>
      </section>

      {/* ============ DORES ============ */}
      <section className="relative bg-gradient-to-b from-white via-violet-50/30 to-white py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-wider mb-3">
              Você reconhece isso?
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              As 3 coisas que mais
              <br/>
              <span className="bg-gradient-to-r from-fuchsia-600 to-violet-600 bg-clip-text text-transparent">
                tiram seu sono
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                emoji: '🤯',
                titulo: '"Trabalho muito e o dinheiro some"',
                desc: 'Você fatura R$ 5 mil, R$ 8 mil... mas no fim do mês olha a conta e tá zerada. Cadê o dinheiro?',
                cor: 'from-rose-500 to-pink-500',
              },
              {
                emoji: '😰',
                titulo: '"Vou pagar imposto a mais ou a menos?"',
                desc: 'DAS, Nota Fiscal, DASN. Cada termo é uma dor de cabeça. Você adia, deixa pra depois, e fica com medo da Receita.',
                cor: 'from-orange-500 to-amber-500',
              },
              {
                emoji: '📊',
                titulo: '"Não sei se posso comprar isso"',
                desc: 'Quer comprar um equipamento, pagar um curso, tirar férias. Mas você não sabe se tem dinheiro ou se vai quebrar.',
                cor: 'from-violet-500 to-fuchsia-500',
              },
            ].map((d) => (
              <div key={d.titulo} className="group relative bg-white rounded-3xl p-6 border border-gray-100 shadow-soft hover:shadow-xl transition">
                <div className={`absolute -top-3 -right-3 w-12 h-12 rounded-2xl bg-gradient-to-br ${d.cor} flex items-center justify-center text-2xl shadow-lg`}>
                  {d.emoji}
                </div>
                <h3 className="font-extrabold text-gray-900 text-lg mb-2 pr-12 leading-snug">
                  {d.titulo}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="relative bg-white py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
              Como resolve
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Tudo que você
              <br/>
              <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                precisa, em 1 app
              </span>
            </h2>
          </div>

          {/* Feature 1 - dashboard */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-4">DASHBOARD</div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                Quanto sobrou de verdade
                <br/>
                <span className="text-violet-600">depois do imposto</span>
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Não é só "entrou menos saiu". A gente já tira o DAS, separa
                gasto pessoal de trabalho, e mostra o lucro real do mês.
              </p>
              <ul className="space-y-3">
                {['Lucro real (já com imposto descontado)', 'Comparativo com o mês anterior', 'Alertas inteligentes (limite MEI, DAS, notas)'].map(item => (
                  <li key={item} className="flex items-start gap-3 text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-200 to-fuchsia-200 rounded-3xl blur-2xl opacity-50"/>
              <div className="relative bg-white rounded-3xl p-6 border border-gray-100 shadow-xl">
                <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white mb-4">
                  <div className="text-xs font-semibold opacity-90 mb-1">SOBROU PRA VOCÊ EM JUNHO</div>
                  <div className="text-4xl font-extrabold">R$ 2.340,80</div>
                  <div className="text-xs opacity-90 mt-1">↑ +18% vs maio</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100">
                    <div className="text-xs text-emerald-700 font-semibold">ENTROU</div>
                    <div className="text-lg font-extrabold text-emerald-900">R$ 4.820</div>
                  </div>
                  <div className="rounded-xl p-3 bg-orange-50 border border-orange-100">
                    <div className="text-xs text-orange-700 font-semibold">SAIU + IMPOSTO</div>
                    <div className="text-lg font-extrabold text-orange-900">R$ 2.479</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 - DAS */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div className="relative md:order-2">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-200 to-orange-200 rounded-3xl blur-2xl opacity-50"/>
              <div className="relative bg-white rounded-3xl p-6 border border-gray-100 shadow-xl space-y-3">
                <div className="rounded-2xl p-4 bg-amber-50 border-2 border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⏰</span>
                    <div>
                      <div className="font-extrabold text-amber-900">DAS vence em 4 dias</div>
                      <div className="text-xs text-amber-700">20 de junho</div>
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-amber-900 mb-2">R$ 75,90</div>
                  <button className="w-full bg-amber-600 text-white font-bold py-2.5 rounded-xl text-sm">
                    Pagar agora
                  </button>
                </div>
                <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <div>
                    <div className="text-xs font-bold text-emerald-900">Maio pago em 18/05</div>
                    <div className="text-xs text-emerald-700">R$ 75,90</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:order-1">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold mb-4">DAS</div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                Lembrete de
                <br/>
                <span className="text-amber-600">imposto a pagar</span>
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                A gente avisa antes de vencer. Você clica, paga, marca como pago.
                Nunca mais paga juros por esquecimento.
              </p>
              <ul className="space-y-3">
                {['Alerta 7 dias e 1 dia antes', 'Email + push no celular', 'Histórico completo de pagamentos'].map(item => (
                  <li key={item} className="flex items-start gap-3 text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 3 - IA nota */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-bold mb-4">
                <span className="inline-flex items-center gap-1">
                  ✨ IA
                </span>
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                Tira foto da nota,
                <br/>
                <span className="text-fuchsia-600">a IA classifica</span>
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Comprou material? Tira foto do cupom. A gente lê o valor,
                a categoria, se é dedutível, e já lança. Você só confirma.
              </p>
              <ul className="space-y-3">
                {['Lê cupom fiscal, nota e até foto de WhatsApp', 'Categoria + dedutível automático', 'Marca se é trabalho ou pessoal'].map(item => (
                  <li key={item} className="flex items-start gap-3 text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-200 to-violet-200 rounded-3xl blur-2xl opacity-50"/>
              <div className="relative bg-white rounded-3xl p-6 border border-gray-100 shadow-xl">
                <div className="rounded-2xl p-4 bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white text-center mb-3">
                  <div className="text-5xl mb-2">📸</div>
                  <div className="text-sm font-bold">Capturar nota</div>
                </div>
                <div className="rounded-xl p-3 bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>✨</span> IA classificou:
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Estabelecimento</span>
                    <span className="font-semibold text-gray-900">Beauty Color</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Valor</span>
                    <span className="font-semibold text-gray-900">R$ 89,40</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Categoria</span>
                    <span className="font-semibold text-fuchsia-700">🛒 Produto</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Dedutível</span>
                    <span className="font-semibold text-emerald-700">Sim ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de features menores */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {emoji: '📋', titulo: 'DASN-SIMEI guiada', desc: 'Números prontos pra colar no portal em maio. Não precisa contador.'},
              {emoji: '🏖️', titulo: 'Reserva pra imposto', desc: 'Separa automaticamente 6% (ou o que você definir) de cada receita.'},
              {emoji: '📊', titulo: 'Limite MEI ao vivo', desc: 'Mostra quanto falta pra estourar R$ 81 mil e avisa antes.'},
              {emoji: '🧾', titulo: 'Recibo + WhatsApp', desc: 'Gera PDF profissional e manda pro cliente em 1 toque.'},
              {emoji: '👥', titulo: 'Cadastro de clientes', desc: 'Histórico de quem paga em dia, quem deve, quem voltou.'},
              {emoji: '📩', titulo: 'Relatório mensal', desc: 'Todo dia 5 chega no email um fechamento bonito do mês anterior.'},
            ].map(f => (
              <div key={f.titulo} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl hover:border-violet-200 transition">
                <div className="text-3xl mb-3">{f.emoji}</div>
                <h4 className="font-extrabold text-gray-900 mb-1.5">{f.titulo}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMPARATIVO PLANILHA vs GRANA ============ */}
      <section className="bg-gradient-to-b from-white via-slate-50 to-white py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-wider mb-3">
              Comparativo
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Sai da planilha do Excel,
              <br/>
              <span className="bg-gradient-to-r from-fuchsia-600 to-violet-600 bg-clip-text text-transparent">
                vem pro Grana
              </span>
            </h2>
            <p className="text-gray-600 text-lg mt-4 max-w-2xl mx-auto">
              Planilha funciona quando começa. Mas chega num ponto que fórmula quebra,
              backup some, e você passa o domingo arrumando.
            </p>
          </div>

          {/* Tabela desktop */}
          <div className="hidden md:block bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left p-5 text-sm font-bold text-gray-500 uppercase tracking-wider">O que você precisa</th>
                  <th className="text-center p-5 text-sm font-bold text-gray-500 uppercase tracking-wider">📊 Planilha</th>
                  <th className="text-center p-5 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-sm font-bold uppercase tracking-wider">
                    💰 Grana
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {[
                  {label: 'Calcular DAS do mês', planilha: 'manual, todo mês', grana: 'automático'},
                  {label: 'Lembrete de imposto a vencer', planilha: '❌ esquece e paga juros', grana: '✓ 7 e 1 dia antes'},
                  {label: 'Lucro real (já com imposto)', planilha: 'só se souber a fórmula', grana: '✓ na tela inicial'},
                  {label: 'Foto da nota fiscal', planilha: 'impossível', grana: '✓ IA classifica'},
                  {label: 'Limite MEI ao vivo', planilha: 'soma na mão', grana: '✓ barra de progresso'},
                  {label: 'Recibo PDF pro cliente', planilha: 'monta no Word', grana: '✓ 1 toque + WhatsApp'},
                  {label: 'DASN-SIMEI em maio', planilha: 'pânico', grana: '✓ pronta pra colar'},
                  {label: 'Backup', planilha: 'Drive, se lembrar', grana: '✓ na nuvem 24/7'},
                  {label: 'Funciona no celular', planilha: 'travada e zoom', grana: '✓ feito pra mobile'},
                  {label: 'Tempo gasto por mês', planilha: '~3 horas', grana: '~10 minutos', destaque: true},
                ].map((row, i) => (
                  <tr key={row.label} className={`border-b border-gray-50 ${row.destaque ? 'bg-emerald-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    <td className="p-4 font-semibold text-gray-900">{row.label}</td>
                    <td className="p-4 text-center text-gray-500 text-sm">{row.planilha}</td>
                    <td className={`p-4 text-center font-bold text-sm ${row.destaque ? 'text-emerald-700' : 'text-violet-700'}`}>{row.grana}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Versão mobile (cards) */}
          <div className="md:hidden space-y-3">
            {[
              {label: 'Calcular DAS do mês', planilha: 'manual, todo mês', grana: 'automático'},
              {label: 'Lembrete de imposto', planilha: 'esquece e paga juros', grana: '7 e 1 dia antes'},
              {label: 'Lucro real (com imposto)', planilha: 'só se souber a fórmula', grana: 'na tela inicial'},
              {label: 'Foto da nota fiscal', planilha: 'impossível', grana: 'IA classifica'},
              {label: 'Limite MEI ao vivo', planilha: 'soma na mão', grana: 'barra de progresso'},
              {label: 'Recibo pro cliente', planilha: 'monta no Word', grana: '1 toque + WhatsApp'},
              {label: 'DASN-SIMEI em maio', planilha: 'pânico', grana: 'pronta pra colar'},
              {label: 'Tempo por mês', planilha: '~3 horas', grana: '~10 min', destaque: true},
            ].map(row => (
              <div key={row.label} className={`rounded-2xl p-4 border ${row.destaque ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'} shadow-sm`}>
                <div className="font-extrabold text-gray-900 mb-3 text-sm">{row.label}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">📊 Planilha</div>
                    <div className="text-sm text-gray-600">{row.planilha}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-violet-700 font-bold mb-1">💰 Grana</div>
                    <div className={`text-sm font-bold ${row.destaque ? 'text-emerald-700' : 'text-violet-700'}`}>✓ {row.grana}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold px-8 py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition shadow-[0_20px_60px_-12px_rgba(139,92,246,0.5)]"
            >
              Migrar da planilha em 5 minutos
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ TRUST / GARANTIA ============ */}
      <section className="bg-gradient-to-b from-violet-50/40 via-white to-white py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
              Sem risco
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Garantia honesta:
              <br/>
              <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                não gostou, devolvo
              </span>
            </h2>
            <p className="text-gray-600 text-lg mt-4 max-w-2xl mx-auto">
              7 dias grátis pra testar tudo. Se virar Pro e em 30 dias não te mostrar
              quanto você ganha de verdade, devolvo seu dinheiro. Sem perguntar.
            </p>
          </div>

          {/* 3 trust signals */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                emoji: '🔒',
                titulo: 'Dados criptografados',
                desc: 'Senha em hash, banco com SSL, conexão HTTPS. Mesmo eu não vejo sua senha.',
              },
              {
                emoji: '🇧🇷',
                titulo: 'LGPD compliance',
                desc: 'Termos claros, exporta tudo num clique, apaga sua conta quando quiser.',
              },
              {
                emoji: '💳',
                titulo: 'Pagamento seguro (Stripe)',
                desc: 'Mesma plataforma que processa pagamento da Amazon, Shopify, Google.',
              },
            ].map(t => (
              <div key={t.titulo} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft hover:shadow-xl transition text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center text-3xl">
                  {t.emoji}
                </div>
                <h3 className="font-extrabold text-gray-900 mb-2">{t.titulo}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>

          {/* Faixa honestidade */}
          <div className="mt-10 rounded-3xl p-6 md:p-8 bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 text-center">
            <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto">
              <span className="font-extrabold text-gray-900">Transparência total:</span>{' '}
              o Grana acabou de lançar. Você é dos primeiros a usar. Por isso ainda não tenho
              depoimentos pra mostrar — prefiro ser honesto a inventar. Quer fazer parte?
            </p>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="precos" className="bg-white py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
              Preço
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
              Menos de
              <br/>
              <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                R$ 0,60 por dia
              </span>
            </h2>
            <p className="text-gray-600 text-lg">Comece com 7 dias de Pro grátis pra testar tudo. Sem cartão.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-3xl p-7 border-2 border-gray-200">
              <div className="mb-5">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Grátis</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">R$ 0</span>
                  <span className="text-gray-500 text-sm">/sempre</span>
                </div>
              </div>
              <Link href="/signup" className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-2xl mb-6 transition">
                Começar grátis
              </Link>
              <ul className="space-y-2.5 text-sm">
                {[
                  'Importação inicial do extrato ilimitada',
                  '20 lançamentos novos por mês',
                  'Dashboard com lucro real',
                  'Lembrete de DAS',
                  'Cadastro de até 5 clientes',
                ].map(i => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="text-emerald-500 mt-0.5">✓</span>{i}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="relative bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 rounded-3xl p-7 text-white shadow-2xl shadow-violet-500/30">
              <div className="absolute -top-3 right-7 bg-yellow-400 text-yellow-900 text-xs font-extrabold px-3 py-1 rounded-full">
                MAIS POPULAR
              </div>
              <div className="mb-5">
                <div className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Pro</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">R$ 17,90</span>
                  <span className="opacity-80 text-sm">/mês</span>
                </div>
                <div className="text-xs opacity-90 mt-1">ou R$ 179/ano (economiza 2 meses)</div>
              </div>
              <Link href="/signup" className="block w-full text-center bg-white text-violet-700 font-extrabold py-3 rounded-2xl mb-6 hover:scale-[1.02] transition">
                Começar 7 dias grátis
              </Link>
              <ul className="space-y-2.5 text-sm">
                {[
                  'Tudo do Grátis +',
                  'Lançamentos ILIMITADOS',
                  '✨ Foto da nota com IA',
                  '🧾 Recibo PDF + WhatsApp',
                  '📩 Relatório mensal automático',
                  '📋 DASN-SIMEI com histórico',
                  '👥 Clientes ilimitados',
                  '🏖️ Reserva de impostos automática',
                ].map(i => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-300 mt-0.5">✓</span>{i}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            7 dias grátis. Sem cartão pra começar. Cancela quando quiser.
          </p>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="bg-gradient-to-b from-white to-violet-50/30 py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Perguntas que
              <br/>
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                MEIs sempre fazem
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {q: 'Como funciona o teste grátis?', a: 'Você cria conta e ganha 7 dias de Pro grátis pra testar tudo — sem precisar de cartão. Pode importar seu extrato inteiro (sem limite no onboarding), tirar foto de nota com IA, gerar recibo, ver dashboard completo. No 8º dia, se quiser continuar, é R$ 17,90/mês. Se não, vira Free com até 20 lançamentos novos por mês — e o histórico que você importou continua todo lá.'},
              {q: 'Preciso entender de contabilidade?', a: 'Não. O app fala em português de gente. "Sobrou pra você", "vai pagar imposto", "tá tranquilo no limite MEI". Sem termo técnico.'},
              {q: 'Substitui meu contador?', a: 'Pra MEI, sim. A DASN-SIMEI a gente entrega prontinha pra você colar no portal. Se você vira ME (Simples), aí vale ter contador.'},
              {q: 'E se eu não for MEI ainda?', a: 'Você pode começar mesmo assim. Mas o app é otimizado pra MEI — alertas, limites e reservas são pensados pra esse regime.'},
              {q: 'Meus dados ficam seguros?', a: 'Sim. Senha criptografada, banco com SSL, e a gente nunca compartilha nada com terceiros. Pode exportar e apagar tudo quando quiser.'},
              {q: 'Como cancelo?', a: 'Em 1 clique nas configurações. Sem ligação, sem retenção, sem chato.'},
            ].map((f, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-gray-100 hover:border-violet-200 transition overflow-hidden">
                <summary className="flex justify-between items-center p-5 cursor-pointer list-none">
                  <span className="font-extrabold text-gray-900 pr-4">{f.q}</span>
                  <span className="text-violet-600 text-2xl group-open:rotate-45 transition flex-shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5 text-gray-600 leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ESCURO ============ */}
      <section className="relative overflow-hidden bg-black text-white py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl" style={{background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(236,72,153,0.2) 35%, transparent 70%)'}}/>
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}/>

        <div className="relative max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Comece a saber
            <br/>
            <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              quanto você ganha
            </span>
          </h2>
          <p className="text-xl text-white/70 mb-10">
            7 dias grátis. Sem cartão. Cancela quando quiser.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition shadow-[0_20px_60px_-12px_rgba(255,255,255,0.4)]"
            >
              Começar grátis
              <span>→</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/20 backdrop-blur-sm text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-black border-t border-white/10 text-white/60 py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="font-extrabold text-white">Grana</span>
            <span className="text-xs ml-2">© 2026</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
            <Link href="/termos" className="hover:text-white">Termos</Link>
            <a href="mailto:ola@grana.app" className="hover:text-white">Contato</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
