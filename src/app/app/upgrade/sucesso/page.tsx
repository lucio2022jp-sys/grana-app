/**
 * Pagina de sucesso pos-checkout. O webhook do Stripe ja processou o pagamento,
 * mas como webhooks rodam async, mostra aqui um estado otimista com poll
 * leve pra atualizar o plano caso o webhook ainda nao tenha rodado.
 */
import Link from 'next/link';

export const metadata = { title: 'Pagamento concluido — Grana' };

export default function UpgradeSucessoPage() {
  return (
    <main className="flex-1 p-5 max-w-md mx-auto">
      <div className="text-center py-10">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          Bem-vinda ao Grana Pro!
        </h1>
        <p className="text-gray-600 text-sm mb-8 px-2">
          Pagamento confirmado. Tudo liberado pra usar sem limite.
          Em alguns segundos seu plano aparece atualizado em todo o app.
        </p>

        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 mb-6 text-left">
          <h2 className="font-bold text-violet-900 mb-2 text-sm">
            O que voce pode fazer agora
          </h2>
          <ul className="text-sm text-violet-800 space-y-1">
            <li>• Lancamentos manuais sem limite</li>
            <li>• Captura de nota com IA</li>
            <li>• Importacao de extrato</li>
            <li>• Lembretes de DAS por email</li>
            <li>• Reserva automatica de impostos</li>
          </ul>
        </div>

        <Link
          href="/app"
          className="block w-full bg-violet-600 text-white text-center font-semibold py-3 rounded-2xl hover:bg-violet-700 transition"
        >
          Ir pro painel
        </Link>

        <p className="text-xs text-gray-500 mt-4">
          Recibo enviado pro seu email. Pra cancelar a qualquer momento, vai em
          Perfil → Gerenciar assinatura.
        </p>
      </div>
    </main>
  );
}
