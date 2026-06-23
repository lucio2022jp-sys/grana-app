'use client';

/**
 * Botao flutuante de WhatsApp pra suporte. Aparece no canto inferior
 * direito apos o usuario rolar um pouco (pra nao competir com hero).
 *
 * - So mostra fora do /app autenticado (la ja tem bottom nav)
 * - Numero vem de NEXT_PUBLIC_WHATSAPP_NUMBER. Se nao tiver setado,
 *   nao renderiza nada.
 * - Mensagem pre-preenchida customizavel.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Props = {
  /**
   * Mensagem pre-preenchida ao abrir o WhatsApp.
   */
  message?: string;
  /**
   * Quanto rolar antes de aparecer (px). Default 200.
   */
  showAfterScroll?: number;
};

export default function WhatsAppFloat({
  message = 'Oi! Vi o Grana e queria saber mais antes de testar.',
  showAfterScroll = 200,
}: Props) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > showAfterScroll);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showAfterScroll]);

  // Nao mostra dentro do app autenticado nem em paginas de auth
  const hideOn = ['/app', '/login', '/signup', '/onboarding', '/checkout'];
  const shouldHide = hideOn.some(
    (p) => pathname === p || pathname?.startsWith(p + '/'),
  );

  if (!number || closed || shouldHide) return null;

  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  function onClick() {
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('whatsapp_click');
    }
  }

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="relative">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          aria-label="Falar no WhatsApp"
          className="flex items-center gap-2 bg-[#25D366] text-white font-bold px-4 py-3 rounded-full shadow-2xl hover:scale-105 transition-transform"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
          </svg>
          <span className="hidden sm:inline">Fala com a gente</span>
        </a>
        <button
          onClick={() => setClosed(true)}
          aria-label="Fechar"
          className="absolute -top-1 -right-1 w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center hover:bg-gray-900"
        >
          ×
        </button>
      </div>
    </div>
  );
}
