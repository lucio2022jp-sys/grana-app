'use client';

/**
 * Pagina /app/indique - programa member-get-member.
 * MEI ve seu codigo, link, contadores e ultimas indicacoes. Botao copia
 * link e dispara compartilhamento via Web Share API quando disponivel.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Resumo = {
  code: string;
  link: string;
  shortLink: string;
  totalIndicados: number;
  totalRecompensados: number;
  diasBonusGanhos: number;
  totalCliques: number;
  recentes: Array<{ nome: string | null; criadoEm: string; recompensado: boolean }>;
};

/**
 * Monta variante do shortLink com utm_medium especifico. A gente usa
 * shortLink (/r/CODE) pra cada compartilhamento porque ele:
 *   1. Conta clique no banco (referralClickCount).
 *   2. Carrega utm_medium pra signup, alimentando referralUtmMedium do user.
 */
function linkComMedium(shortLink: string, medium: string) {
  const u = new URL(shortLink);
  u.searchParams.set('utm_source', 'referral');
  u.searchParams.set('utm_medium', medium);
  u.searchParams.set('utm_campaign', 'member_get_member');
  return u.toString();
}

export default function IndiquePage() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/referral')
      .then((r) => r.json())
      .then((data) => {
        if (cancelado) return;
        if (data?.error) {
          setErro('Faca login pra ver seu codigo.');
        } else {
          setResumo(data);
        }
      })
      .catch(() => {
        if (!cancelado) setErro('Nao consegui carregar seus dados.');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function copiar() {
    if (!resumo) return;
    try {
      await navigator.clipboard.writeText(linkComMedium(resumo.shortLink, 'copy'));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback silencioso
    }
  }

  async function compartilhar() {
    if (!resumo) return;
    const url = linkComMedium(resumo.shortLink, 'share');
    const texto = `Indico esse app pra organizar a grana do trabalho autonomo. ${url}`;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: 'Grana App', text: texto, url });
        return;
      } catch {
        // usuario cancelou compartilhamento
      }
    }
    // fallback: copia
    await copiar();
  }

  function compartilharWhatsapp() {
    if (!resumo) return;
    const url = linkComMedium(resumo.shortLink, 'whatsapp');
    const texto = `Tô usando esse app pra organizar a grana do trabalho autonomo, super recomendo. Cria conta por aqui e a gente ganha 30 dias Pro de graca: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  return (
    <main className="flex-1 p-5 max-w-md mx-auto pb-20">
      <div className="mb-6">
        <Link href="/app" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar
        </Link>
      </div>

      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🎁</div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Indique e ganhe Pro
        </h1>
        <p className="text-gray-600 text-sm">
          A cada amiga que assinar, vocês ganham <strong>30 dias grátis de Pro</strong>.
          Sem limite.
        </p>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 mb-4">
          {erro}
        </div>
      )}

      {resumo && (
        <>
          <div className="bg-gradient-cool rounded-3xl p-6 text-white shadow-glow-cool mb-6">
            <div className="text-xs uppercase font-bold opacity-90 mb-2">Seu codigo</div>
            <div className="text-4xl font-black tracking-wider mb-4">{resumo.code}</div>
            <div className="bg-white/20 rounded-xl px-3 py-2 text-xs break-all mb-4">
              {resumo.shortLink}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={copiar}
                className="bg-white text-secondary-700 font-bold py-3 rounded-2xl shadow-soft active:scale-95 transition text-xs"
              >
                {copiado ? '✓ Copiado' : '📋 Copiar'}
              </button>
              <button
                type="button"
                onClick={compartilharWhatsapp}
                className="bg-[#25D366] text-white font-bold py-3 rounded-2xl active:scale-95 transition text-xs shadow-soft"
              >
                💬 WhatsApp
              </button>
              <button
                type="button"
                onClick={compartilhar}
                className="bg-white/20 backdrop-blur border border-white/30 text-white font-bold py-3 rounded-2xl active:scale-95 transition text-xs"
              >
                📲 Mais
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center shadow-soft">
              <div className="text-xl font-extrabold text-gray-900">{resumo.totalCliques}</div>
              <div className="text-[10px] uppercase font-bold text-gray-500 mt-1">Cliques</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center shadow-soft">
              <div className="text-xl font-extrabold text-gray-900">{resumo.totalIndicados}</div>
              <div className="text-[10px] uppercase font-bold text-gray-500 mt-1">Cadastros</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center shadow-soft">
              <div className="text-xl font-extrabold text-green-600">{resumo.totalRecompensados}</div>
              <div className="text-[10px] uppercase font-bold text-gray-500 mt-1">Pagaram</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center shadow-soft">
              <div className="text-xl font-extrabold text-purple-600">{resumo.diasBonusGanhos}</div>
              <div className="text-[10px] uppercase font-bold text-gray-500 mt-1">Dias Pro</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-soft mb-6">
            <h2 className="text-sm font-extrabold text-gray-900 mb-3">Como funciona</h2>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="bg-purple-100 text-purple-700 font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0">1</span>
                <span>Compartilha seu link com amigas autonomas.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-purple-100 text-purple-700 font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0">2</span>
                <span>Ela cria conta e testa o app gratis.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-purple-100 text-purple-700 font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0">3</span>
                <span>Quando ela assinar Pro, voces dois ganham 30 dias.</span>
              </li>
            </ol>
          </div>

          {resumo.recentes.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-soft">
              <h2 className="text-sm font-extrabold text-gray-900 mb-3">Suas indicacoes</h2>
              <ul className="space-y-2">
                {resumo.recentes.map((r, i) => (
                  <li key={i} className="flex items-center justify-between text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                    <div>
                      <div className="font-semibold text-gray-900">{r.nome ?? 'Sem nome'}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(r.criadoEm).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    {r.recompensado ? (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                        +30 dias
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-full">
                        Pendente
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  );
}
