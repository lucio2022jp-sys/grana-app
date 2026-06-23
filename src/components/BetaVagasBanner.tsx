'use client';

/**
 * Banner de urgencia "Beta fechado — X vagas restantes".
 *
 * Busca contagem em /api/beta-vagas. Cai num fallback generico
 * ("vagas limitadas") se a API nao responder.
 *
 * Variantes:
 *  - default: card grande pra topo de landing
 *  - strip: faixa fina pra topo da pagina (z-index 40)
 */
import { useEffect, useState } from 'react';

type Props = {
  variant?: 'default' | 'strip';
  className?: string;
};

export default function BetaVagasBanner({
  variant = 'default',
  className = '',
}: Props) {
  const [restantes, setRestantes] = useState<number | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetch('/api/beta-vagas')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.restantes === 'number') setRestantes(d.restantes);
        else setErro(true);
      })
      .catch(() => setErro(true));
  }, []);

  const texto = (() => {
    if (erro || restantes === null) return 'Beta fechado — vagas limitadas';
    if (restantes === 0) return 'Beta esgotado — entra na lista de espera';
    if (restantes <= 10) return `Só ${restantes} vagas Beta restantes`;
    return `${restantes} vagas Beta restantes`;
  })();

  if (variant === 'strip') {
    return (
      <div
        className={`bg-secondary-600 text-white text-center text-xs font-bold py-2 px-3 ${className}`}
      >
        🔥 {texto}
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-r from-secondary-100 to-primary-100 border-2 border-secondary-300 rounded-2xl px-4 py-3 flex items-center gap-3 ${className}`}
    >
      <div className="text-2xl shrink-0">🔥</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-secondary-900 text-sm">
          Beta fechado
        </div>
        <div className="text-xs text-secondary-700">{texto}</div>
      </div>
    </div>
  );
}
