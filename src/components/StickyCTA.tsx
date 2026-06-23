'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Sticky CTA mobile: aparece depois que rolou ~600px (passou do hero)
 * e some quando chega perto do CTA final (`#cta-final`) pra nao duplicar.
 * Tem um X pra fechar (lembra na sessao).
 */
export default function StickyCTA() {
  const [show, setShow] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('stickyCtaClosed') === '1') {
      setClosed(true);
      return;
    }

    const onScroll = () => {
      if (window.scrollY < 600) {
        setShow(false);
        return;
      }
      // Some perto do CTA final pra nao duplicar
      const ctaFinal = document.getElementById('cta-final');
      if (ctaFinal) {
        const rect = ctaFinal.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          setShow(false);
          return;
        }
      }
      setShow(true);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (closed || !show) return null;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50 px-4 pb-4 pt-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
      <div className="flex items-center gap-2 bg-white rounded-2xl p-2 pl-4 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">7 dias grátis</div>
          <div className="text-sm font-extrabold text-gray-900 leading-tight">Começa agora, sem cartão</div>
        </div>
        <Link
          href="/signup"
          className="shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold px-4 py-3 rounded-xl active:scale-95 transition shadow-lg"
        >
          Criar conta →
        </Link>
        <button
          onClick={() => {
            sessionStorage.setItem('stickyCtaClosed', '1');
            setClosed(true);
          }}
          aria-label="Fechar"
          className="shrink-0 w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 active:scale-95"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
