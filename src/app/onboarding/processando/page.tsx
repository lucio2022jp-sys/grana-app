'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ProcessandoInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    // Repassa parametros pra tela de resultado (ex: novas, duplicadas)
    const novas = params.get('novas');
    const duplicadas = params.get('duplicadas');
    const t = setTimeout(() => {
      const url = new URL('/onboarding/resultado', window.location.origin);
      if (novas) url.searchParams.set('novas', novas);
      if (duplicadas) url.searchParams.set('duplicadas', duplicadas);
      router.push(url.pathname + url.search);
    }, 2800);
    return () => clearTimeout(t);
  }, [router, params]);

  return null;
}

export default function ProcessandoPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-gradient-cool relative overflow-hidden">
      <Suspense fallback={null}>
        <ProcessandoInner />
      </Suspense>

      {/* Decoracoes flutuantes */}
      <div className="absolute top-20 left-8 text-3xl animate-float opacity-50" aria-hidden>💵</div>
      <div className="absolute top-32 right-10 text-4xl animate-float-slow opacity-40" aria-hidden>📈</div>
      <div className="absolute bottom-32 left-12 text-3xl animate-float opacity-60" aria-hidden>✨</div>
      <div className="absolute bottom-48 right-8 text-4xl animate-float-slow opacity-50" aria-hidden>💸</div>

      <div className="relative z-10 w-full">
        <div className="text-7xl mb-8 animate-pulse-soft">⚡</div>

        <h1 className="text-3xl font-extrabold text-white mb-3">
          Lendo seu extrato...
        </h1>
        <p className="text-blue-100 mb-10">
          Estamos descobrindo seus numeros 🔍
        </p>

        <div className="w-full max-w-xs mx-auto bg-white/30 rounded-full h-3 overflow-hidden mb-10 backdrop-blur">
          <div className="bg-white h-3 rounded-full animate-progress shadow-lg" />
        </div>

        <ul className="text-left space-y-4 max-w-xs mx-auto">
          <li className="flex gap-3 items-center bg-white/20 backdrop-blur rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
            <span className="text-green-300 text-2xl">✓</span>
            <span className="text-white font-medium text-sm">Lendo paginas do PDF</span>
          </li>
          <li className="flex gap-3 items-center bg-white/20 backdrop-blur rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.8s', opacity: 0 }}>
            <span className="text-green-300 text-2xl">✓</span>
            <span className="text-white font-medium text-sm">Encontrando suas transacoes</span>
          </li>
          <li className="flex gap-3 items-center bg-white/20 backdrop-blur rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '1.4s', opacity: 0 }}>
            <span className="text-yellow-300 text-2xl animate-pulse">⏳</span>
            <span className="text-white font-medium text-sm">Categorizando despesas com IA</span>
          </li>
        </ul>
      </div>

      <style jsx>{`
        @keyframes progressAnim {
          0% { width: 5%; }
          30% { width: 35%; }
          60% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progressAnim 2.6s ease-out forwards;
        }
      `}</style>
    </main>
  );
}
