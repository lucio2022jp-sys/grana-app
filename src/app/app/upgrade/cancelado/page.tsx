/**
 * Pagina de cancelamento do checkout. Usuaria desistiu antes de pagar.
 * Sem prejuizo nenhum, so volta pro app.
 */
import Link from 'next/link';

export const metadata = { title: 'Pagamento cancelado — Grana' };

export default function UpgradeCanceladoPage() {
  return (
    <main className="flex-1 p-5 max-w-md mx-auto">
      <div className="text-center py-10">
        <div className="text-5xl mb-4">😌</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          Sem problema
        </h1>
        <p className="text-gray-600 text-sm mb-8 px-2">
          Pagamento nao concluido. Voce pode tentar de novo quando quiser.
        </p>

        <div className="space-y-3">
          <Link
            href="/app/upgrade"
            className="block w-full bg-violet-600 text-white text-center font-semibold py-3 rounded-2xl hover:bg-violet-700 transition"
          >
            Ver o plano Pro de novo
          </Link>
          <Link
            href="/app"
            className="block w-full bg-white border-2 border-gray-200 text-gray-700 text-center font-semibold py-3 rounded-2xl hover:border-gray-300 transition"
          >
            Voltar pro painel
          </Link>
        </div>
      </div>
    </main>
  );
}
