'use client';

/**
 * Painel "Checkup do MEI" — visao executiva de tudo num lugar so.
 * Cada item tem 3 estados visuais: verde (ok), amarelo (atencao),
 * vermelho (acao necessaria).
 *
 * E uma tela de SUMARIO. Cada bloco tem link pra tela detalhada onde
 * o user resolve a pendencia.
 *
 * Nao calcula nada novo: agrega chamadas a endpoints ja existentes.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Status = 'ok' | 'atencao' | 'risco';

type CheckupItem = {
  status: Status;
  titulo: string;
  detalhe: string;
  href: string;
};

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusColor(s: Status) {
  switch (s) {
    case 'ok': return 'bg-green-50 border-green-200';
    case 'atencao': return 'bg-amber-50 border-amber-200';
    case 'risco': return 'bg-red-50 border-red-200';
  }
}

function statusEmoji(s: Status) {
  switch (s) {
    case 'ok': return '🟢';
    case 'atencao': return '🟡';
    case 'risco': return '🔴';
  }
}

function statusTextColor(s: Status) {
  switch (s) {
    case 'ok': return 'text-green-800';
    case 'atencao': return 'text-amber-800';
    case 'risco': return 'text-red-800';
  }
}

export default function CheckupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CheckupItem[]>([]);
  const [resumo, setResumo] = useState<{
    receitaAno: number;
    sobrouMes: number;
    percentTeto: number;
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [dashRes, dasRes, dasnRes, saudeRes, notasRes, reservaRes] = await Promise.all([
        fetch('/api/dashboard').then((r) => r.json()),
        fetch('/api/das').then((r) => r.json()),
        fetch('/api/dasn').then((r) => r.json()),
        fetch('/api/saude').then((r) => r.json()),
        fetch('/api/notas-pendentes').then((r) => r.json()),
        fetch('/api/tax-reserve').then((r) => r.json()).catch(() => null),
      ]);

      setResumo({
        receitaAno: dashRes.yearReceita ?? 0,
        sobrouMes: dashRes.sobrou ?? 0,
        percentTeto: dashRes.meiPercent ?? 0,
      });

      const lista: CheckupItem[] = [];

      // 1. Teto MEI
      const projecao = dashRes.meiProjecao;
      if (projecao) {
        if (projecao.status === 'tranquilo') {
          lista.push({
            status: 'ok',
            titulo: 'Faturamento dentro do limite',
            detalhe: `${dashRes.meiPercent}% do teto MEI. Projecao do ano: ${brl(projecao.projecaoAnual)}.`,
            href: '/app/evolucao',
          });
        } else if (projecao.status === 'atento') {
          lista.push({
            status: 'atencao',
            titulo: 'De olho no faturamento',
            detalhe: projecao.mensagem,
            href: '/app/evolucao',
          });
        } else {
          lista.push({
            status: 'risco',
            titulo: projecao.status === 'desenquadre'
              ? 'Risco de desenquadre'
              : projecao.status === 'estourado'
                ? 'Voce passou do teto MEI'
                : 'Atencao com o ritmo',
            detalhe: projecao.mensagem,
            href: '/app/evolucao',
          });
        }
      }

      // 2. DAS do mes
      const das = dasRes.current;
      if (das) {
        if (das.paidAt) {
          lista.push({
            status: 'ok',
            titulo: 'DAS do mes pago',
            detalhe: `Pago em ${new Date(das.paidAt).toLocaleDateString('pt-BR')}.`,
            href: '/app/das',
          });
        } else if (das.status === 'atrasado') {
          lista.push({
            status: 'risco',
            titulo: 'DAS atrasado',
            detalhe: `Vencido em ${new Date(das.dueDate).toLocaleDateString('pt-BR')}. Resolva agora.`,
            href: '/app/das',
          });
        } else if (das.status === 'urgente') {
          lista.push({
            status: 'atencao',
            titulo: 'DAS vence em breve',
            detalhe: `${brl(das.total)} ate ${new Date(das.dueDate).toLocaleDateString('pt-BR')}.`,
            href: '/app/das',
          });
        } else {
          lista.push({
            status: 'ok',
            titulo: 'DAS do mes em dia',
            detalhe: `Vence em ${new Date(das.dueDate).toLocaleDateString('pt-BR')}.`,
            href: '/app/das',
          });
        }
      }

      // 3. DASN anual (so se aberto OU se passou e nao foi entregue)
      if (dasnRes.year && dasnRes.receitaBruta > 0) {
        // Verifica se ja foi entregue
        const recibosRes = await fetch('/api/dasn/recibos').then((r) => r.json()).catch(() => ({ recibos: [] }));
        const jaEntregue = (recibosRes.recibos ?? []).some((r: any) => r.year === dasnRes.year);

        if (jaEntregue) {
          lista.push({
            status: 'ok',
            titulo: `DASN ${dasnRes.year} entregue`,
            detalhe: 'Declaracao anual do MEI registrada.',
            href: '/app/dasn',
          });
        } else if (dasnRes.aberto) {
          if ((dasnRes.diasRestantes ?? 999) < 30) {
            lista.push({
              status: 'risco',
              titulo: `DASN ${dasnRes.year} - ${dasnRes.diasRestantes}d`,
              detalhe: `Prazo final 31/05/${dasnRes.year + 1}. Nao deixe passar.`,
              href: '/app/dasn',
            });
          } else {
            lista.push({
              status: 'atencao',
              titulo: `DASN ${dasnRes.year} pra entregar`,
              detalhe: `${dasnRes.diasRestantes} dias ate o prazo. Receita ${brl(dasnRes.receitaBruta)}.`,
              href: '/app/dasn',
            });
          }
        }
      }

      // 4. Notas fiscais pendentes
      if (notasRes.count > 0) {
        if (notasRes.atrasadas > 0) {
          lista.push({
            status: 'risco',
            titulo: `${notasRes.atrasadas} NF atrasada${notasRes.atrasadas > 1 ? 's' : ''}`,
            detalhe: `${notasRes.count} receitas sem nota emitida (${brl(notasRes.total)}).`,
            href: '/app/notas-pendentes',
          });
        } else {
          lista.push({
            status: 'atencao',
            titulo: `${notasRes.count} NF pendente${notasRes.count > 1 ? 's' : ''}`,
            detalhe: `${brl(notasRes.total)} aguardando emissao.`,
            href: '/app/notas-pendentes',
          });
        }
      } else {
        lista.push({
          status: 'ok',
          titulo: 'Notas em dia',
          detalhe: 'Nenhuma receita pendente de NF.',
          href: '/app/notas-pendentes',
        });
      }

      // 5. Saude PF/PJ
      if (saudeRes && saudeRes.nivel) {
        if (saudeRes.nivel === 'saudavel') {
          lista.push({
            status: 'ok',
            titulo: 'Separacao PF/PJ saudavel',
            detalhe: `${saudeRes.percentPessoal}% das saidas sao gastos pessoais. Bom equilibrio.`,
            href: '/app/saude',
          });
        } else if (saudeRes.nivel === 'atencao') {
          lista.push({
            status: 'atencao',
            titulo: 'Misturando PF e PJ',
            detalhe: `${saudeRes.percentPessoal}% das saidas sao gastos pessoais. Considere separar.`,
            href: '/app/saude',
          });
        } else if (saudeRes.nivel === 'risco') {
          lista.push({
            status: 'risco',
            titulo: 'Risco fiscal: muito gasto pessoal',
            detalhe: `${saudeRes.percentPessoal}% das saidas. Receita pode questionar.`,
            href: '/app/saude',
          });
        }
      }

      // 6. Reserva de impostos
      if (reservaRes && typeof reservaRes.totalReservado === 'number') {
        const meta = reservaRes.metaMes ?? 0;
        const reservado = reservaRes.totalReservadoMes ?? reservaRes.totalReservado ?? 0;
        if (meta > 0) {
          const pct = meta > 0 ? Math.round((reservado / meta) * 100) : 100;
          if (pct >= 80) {
            lista.push({
              status: 'ok',
              titulo: 'Reserva de imposto em dia',
              detalhe: `Reservou ${brl(reservado)} esse mes (${pct}% da meta).`,
              href: '/app/reserva',
            });
          } else if (pct >= 50) {
            lista.push({
              status: 'atencao',
              titulo: 'Reserva incompleta',
              detalhe: `Reservou ${brl(reservado)} de ${brl(meta)} (${pct}%).`,
              href: '/app/reserva',
            });
          } else {
            lista.push({
              status: 'risco',
              titulo: 'Pouco reservado pra imposto',
              detalhe: `So ${brl(reservado)} reservado esse mes. Meta: ${brl(meta)}.`,
              href: '/app/reserva',
            });
          }
        }
      }

      setItems(lista);
    } catch (e) {
      console.error('Erro carregando checkup:', e);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Resumo geral: vermelho > amarelo > verde
  const criticos = items.filter((i) => i.status === 'risco').length;
  const atencao = items.filter((i) => i.status === 'atencao').length;
  const ok = items.filter((i) => i.status === 'ok').length;

  const overallStatus: Status = criticos > 0 ? 'risco' : atencao > 0 ? 'atencao' : 'ok';
  const overallTexto = criticos > 0
    ? `${criticos} ponto${criticos > 1 ? 's' : ''} cr${criticos > 1 ? 'i' : 'i'}tico${criticos > 1 ? 's' : ''}`
    : atencao > 0
      ? `${atencao} ponto${atencao > 1 ? 's' : ''} de aten${atencao > 1 ? 'cao' : 'cao'}`
      : 'Tudo em ordem';

  return (
    <main className="flex-1 p-5">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">🔍 Checkup do MEI</h1>
        <p className="text-sm text-gray-500">
          Como esta a saude da sua empresa agora.
        </p>
      </div>

      {loading && <div className="text-gray-400">Analisando...</div>}

      {!loading && (
        <>
          {/* Resumo geral em destaque */}
          <div className={`rounded-3xl p-5 mb-4 border-2 ${statusColor(overallStatus)}`}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{statusEmoji(overallStatus)}</span>
              <div>
                <div className={`font-extrabold text-lg ${statusTextColor(overallStatus)}`}>
                  {overallTexto}
                </div>
                <div className="text-xs text-gray-700">
                  {ok} verde · {atencao} amarelo · {criticos} vermelho
                </div>
              </div>
            </div>
          </div>

          {/* Mini-stats */}
          {resumo && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
                <div className="text-xs text-gray-500 font-semibold">Sobrou (mes)</div>
                <div className="text-sm font-extrabold text-purple-700">{brl(resumo.sobrouMes)}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
                <div className="text-xs text-gray-500 font-semibold">Receita (ano)</div>
                <div className="text-sm font-extrabold text-emerald-700">{brl(resumo.receitaAno)}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
                <div className="text-xs text-gray-500 font-semibold">% do teto</div>
                <div className={`text-sm font-extrabold ${
                  resumo.percentTeto > 90 ? 'text-red-600' :
                  resumo.percentTeto > 70 ? 'text-orange-600' :
                  'text-blue-600'
                }`}>
                  {resumo.percentTeto}%
                </div>
              </div>
            </div>
          )}

          {/* Lista detalhada — riscos primeiro */}
          <div className="space-y-2">
            {[...items]
              .sort((a, b) => {
                const ord = { risco: 0, atencao: 1, ok: 2 };
                return ord[a.status] - ord[b.status];
              })
              .map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className={`block rounded-2xl p-4 border-2 transition hover:scale-[1.01] active:scale-95 ${statusColor(item.status)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{statusEmoji(item.status)}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm ${statusTextColor(item.status)}`}>
                        {item.titulo}
                      </div>
                      <div className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                        {item.detalhe}
                      </div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </div>
                </Link>
              ))}
          </div>

          {/* Aviso: estimativas */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-6 text-xs text-blue-900 leading-relaxed">
            <div className="font-bold mb-1">⚠️ Sobre os numeros</div>
            Os calculos do Grana sao baseados nas suas transacoes classificadas
            no app. Sao <strong>estimativas pra te orientar</strong>, nao
            calculos oficiais. Antes de declarar imposto ou pagar DAS, sempre
            confira no portal da Receita / portal do MEI.
          </div>
        </>
      )}
    </main>
  );
}
