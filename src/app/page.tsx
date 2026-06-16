import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export default async function HomePage() {
  const uid = cookies().get('grana_uid')?.value;
  if (uid) {
    const count = await prisma.transaction.count({ where: { userId: uid } });
    if (count > 0) redirect('/app');
  }

  return (
    <main className="flex-1 flex flex-col bg-gradient-hero relative overflow-hidden">
      {/* Decoracoes flutuantes de fundo */}
      <div className="absolute top-10 left-6 text-5xl animate-float opacity-90" aria-hidden>💰</div>
      <div className="absolute top-20 right-8 text-4xl animate-float-slow opacity-80" aria-hidden>📊</div>
      <div className="absolute top-40 left-10 text-3xl animate-float opacity-70" aria-hidden>✨</div>
      <div className="absolute bottom-32 right-6 text-5xl animate-float-slow opacity-80" aria-hidden>💸</div>
      <div className="absolute bottom-48 left-4 text-4xl animate-float opacity-70" aria-hidden>🚀</div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10">
        {/* Badge superior */}
        <div className="bg-white/80 backdrop-blur-sm border border-white rounded-full px-4 py-1.5 mb-6 shadow-soft animate-pop-in">
          <span className="text-xs font-semibold text-secondary-600">
            ✨ MEI / Autonomo / Freelancer
          </span>
        </div>

        {/* Logo grande */}
        <div className="relative mb-6 animate-pop-in" style={{ animationDelay: '0.1s' }}>
          <div className="text-8xl filter drop-shadow-lg">💰</div>
          <div className="absolute -top-2 -right-2 text-3xl animate-wiggle">✨</div>
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mb-3 leading-tight animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          Saiba quanto voce<br />
          <span className="bg-gradient-to-r from-secondary-600 to-accent-pink bg-clip-text text-transparent">
            ganha de verdade
          </span>
        </h1>

        <p className="text-gray-700 mb-10 max-w-xs text-base font-medium animate-slide-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
          Sem planilha. Sem dor de cabeca com imposto. Direto no celular.
        </p>

        <div className="w-full max-w-xs space-y-3 animate-slide-up" style={{ animationDelay: '0.4s', opacity: 0 }}>
          <Link
            href="/onboarding/profissao"
            className="block w-full bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool hover:scale-105 active:scale-95 transition text-center text-lg"
          >
            Comecar gratis 🚀
          </Link>
          <Link
            href="/app"
            className="block text-gray-700 font-medium underline text-sm pt-2"
          >
            Ja tenho conta
          </Link>
        </div>

        {/* Social proof faker */}
        <div className="mt-10 flex items-center gap-3 bg-white/60 backdrop-blur rounded-full px-4 py-2 shadow-soft animate-slide-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-accent-pink flex items-center justify-center text-xs">👩</div>
            <div className="w-7 h-7 rounded-full bg-accent-yellow flex items-center justify-center text-xs">🧑</div>
            <div className="w-7 h-7 rounded-full bg-accent-green flex items-center justify-center text-xs">👨</div>
          </div>
          <span className="text-xs text-gray-700 font-medium">+1.000 autonomos no controle</span>
        </div>
      </div>
    </main>
  );
}
