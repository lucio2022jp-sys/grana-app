import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col pb-24 bg-gradient-to-b from-white to-purple-50/30 min-h-screen">
      {children}
      <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-md bg-white/95 backdrop-blur border-t border-gray-100 z-30 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-5 text-center items-end">
          <Link href="/app" className="py-3 transition group">
            <div className="text-2xl group-hover:scale-110 transition">🏠</div>
            <div className="text-[11px] text-gray-600 font-medium">Inicio</div>
          </Link>
          <Link href="/app/transacoes" className="py-3 transition group">
            <div className="text-2xl group-hover:scale-110 transition">📊</div>
            <div className="text-[11px] text-gray-600 font-medium">Tudo</div>
          </Link>
          <Link href="/app/nova" className="py-3 transition group flex flex-col items-center">
            <div className="w-11 h-11 bg-gradient-cool rounded-full flex items-center justify-center text-white text-xl font-bold shadow-glow-cool group-hover:scale-110 transition">
              ＋
            </div>
            <div className="text-[11px] text-secondary-600 font-bold mt-0.5">Lancar</div>
          </Link>
          <Link href="/app/das" className="py-3 transition group">
            <div className="text-2xl group-hover:scale-110 transition">📋</div>
            <div className="text-[11px] text-gray-600 font-medium">DAS</div>
          </Link>
          <Link href="/app/perfil" className="py-3 transition group">
            <div className="text-2xl group-hover:scale-110 transition">👤</div>
            <div className="text-[11px] text-gray-600 font-medium">Perfil</div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
