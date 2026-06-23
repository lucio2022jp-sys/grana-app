'use client';

/**
 * Captura de lead pra lista de espera/Founder. Compacto, encaixa em
 * qualquer secao da landing.
 *
 * - Aceita email OU WhatsApp (pelo menos um obrigatorio)
 * - Envia source pra rastrear de onde veio
 * - Tem estado de sucesso embutido (mostra mensagem de obrigado)
 *
 * Uso:
 *   <LeadCapture source="hero" title="Garante sua vaga Founder" />
 */
import { useState } from 'react';

type Props = {
  source: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  variant?: 'default' | 'compact' | 'inline';
};

export default function LeadCapture({
  source,
  title = 'Entra na lista de espera',
  subtitle = 'A gente avisa quando abrir vagas Founder com 50% off vitalício.',
  ctaLabel = 'Quero garantir minha vaga',
  variant = 'default',
}: Props) {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!email && !whatsapp) {
      setErro('Preenche email ou WhatsApp');
      return;
    }

    setLoading(true);
    try {
      const utm =
        typeof window !== 'undefined' && window.location.search
          ? window.location.search.slice(1)
          : null;

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || null,
          whatsapp: whatsapp || null,
          source,
          utm,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'erro');
      setSucesso(true);

      // Dispara evento de analytics se PostHog tiver carregado
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('lead_captured', { source });
      }
    } catch (err: any) {
      setErro(err?.message ?? 'Falha ao enviar');
    }
    setLoading(false);
  }

  if (sucesso) {
    return (
      <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 text-center">
        <div className="text-3xl mb-2">🎉</div>
        <div className="font-bold text-green-900">Pronto, tá garantido!</div>
        <div className="text-sm text-green-700 mt-1">
          Quando abrirmos a vaga Founder, você é avisada na hora.
        </div>
      </div>
    );
  }

  const compact = variant === 'compact';
  const inline = variant === 'inline';

  return (
    <div
      className={
        inline
          ? ''
          : `bg-white border-2 border-gray-200 rounded-2xl ${compact ? 'p-4' : 'p-5'}`
      }
    >
      {!inline && (
        <>
          <div className={`font-bold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
            {title}
          </div>
          {subtitle && (
            <div className={`text-gray-600 ${compact ? 'text-xs mt-1' : 'text-sm mt-1.5'}`}>
              {subtitle}
            </div>
          )}
        </>
      )}

      <form onSubmit={submit} className={inline ? 'space-y-2' : 'mt-3 space-y-2'}>
        <input
          type="email"
          placeholder="Seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-secondary-500 focus:outline-none text-sm"
          autoComplete="email"
        />
        <input
          type="tel"
          placeholder="Ou WhatsApp (DDD + número)"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-secondary-500 focus:outline-none text-sm"
          autoComplete="tel"
        />
        {erro && (
          <div className="text-xs text-red-600 font-semibold">{erro}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-cool text-white font-bold py-3 rounded-xl shadow-glow-cool active:scale-95 disabled:opacity-60 text-sm"
        >
          {loading ? 'Enviando...' : ctaLabel}
        </button>
        <div className="text-[10px] text-gray-500 text-center">
          Sem spam. Você pode sair quando quiser.
        </div>
      </form>
    </div>
  );
}
