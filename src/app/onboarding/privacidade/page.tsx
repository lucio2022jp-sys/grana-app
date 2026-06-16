'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const GARANTIAS = [
  {
    emoji: '🔒',
    titulo: 'So voce ve',
    descricao: 'Seu extrato e seus numeros ficam guardados na sua conta. A gente nao manda pra ninguem.',
    cor: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
  },
  {
    emoji: '👁️',
    titulo: 'A gente nao olha',
    descricao: 'O sistema le o PDF e organiza os dados automatico. Nenhuma pessoa abre seu extrato.',
    cor: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-100',
  },
  {
    emoji: '🗑️',
    titulo: 'Voce apaga quando quiser',
    descricao: 'Quer sumir? Toca em "apagar minha conta" no perfil. Tudo some na hora, sem perguntas.',
    cor: 'bg-purple-50 border-purple-200',
    iconBg: 'bg-purple-100',
  },
];

export default function PrivacidadePage() {
  const router = useRouter();

  return (
    <main className="flex-1 flex flex-col px-5 pt-6 pb-12 bg-gradient-to-b from-white via-blue-50/30 to-white">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 text-left w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-2 text-sm font-semibold text-secondary-600">Passo 3 de 4</div>

      <div className="text-center mb-6 animate-pop-in">
        <div className="text-6xl mb-3">🔒</div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
          Antes de continuar,<br />
          <span className="bg-gradient-cool bg-clip-text text-transparent">
            seu dado e seu
          </span>
        </h1>
        <p className="text-gray-600 text-sm">
          A gente leva isso super a serio.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {GARANTIAS.map((g, i) => (
          <div
            key={g.titulo}
            className={`${g.cor} border-2 rounded-2xl p-4 shadow-soft animate-slide-up`}
            style={{ animationDelay: `${0.1 + i * 0.1}s`, opacity: 0 }}
          >
            <div className="flex items-start gap-3">
              <div className={`${g.iconBg} w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0`}>
                {g.emoji}
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 mb-1">{g.titulo}</div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {g.descricao}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <span className="text-xl shrink-0">💡</span>
          <div className="text-xs text-yellow-900 leading-relaxed">
            <span className="font-bold">Como funciona por dentro:</span> seu PDF e
            lido pelo sistema, as transacoes sao salvas no seu perfil, e o arquivo
            original e descartado depois. So fica o resumo organizado pra voce ver.
          </div>
        </div>
      </div>

      <Link
        href="/onboarding/metodo"
        className="block bg-gradient-cool text-white font-bold py-5 rounded-3xl text-center shadow-glow-cool hover:scale-105 active:scale-95 transition text-lg animate-slide-up"
        style={{ animationDelay: '0.5s', opacity: 0 }}
      >
        Ok, vamos la 🚀
      </Link>
    </main>
  );
}
