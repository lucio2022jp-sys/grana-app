'use client';

/**
 * Pagina de upgrade Pro. Botao "Quero o Pro" chama POST /api/stripe/checkout
 * e redireciona pra Checkout Session do Stripe.
 */
import Link from 'next/link';
import { useState } from 'react';

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function iniciarCheckout() {
    setErro(null);
    setLoading(true);
    try {
      const r = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await r.json();
      if (!r.ok || !data.url) {
        throw new Error(data?.error ?? 'Nao consegui abrir o checkout');
      }
      window.location.href = data.url;
    } catch (e: any) {
      setErro(e?.message ?? 'Falha ao abrir checkout');
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 p-5 max-w-md mx-auto">
      <div className="mb-6">
        <Link
          href="/app"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar
        </Link>
      </div>

      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🚀</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          Grana Pro
        </h1>
        <p className="text-gray-600 text-sm">
          Lancamentos ilimitados e tudo o que voce precisa pra cuidar da grana
          do seu negocio.
        </p>
      </div>

      <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-3xl p-6 mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-extrabold text-violet-900">
            R$ 19,90
          </span>
          <span className="text-violet-700 text-sm">/mes</span>
        </div>
        <div className="text-xs text-violet-600 mb-5">
          Cancele quando quiser. Sem fidelidade.
        </div>

        <ul className="space-y-3 text-sm text-gray-800">
          <li className="flex gap-2">
            <span className="text-violet-600">✓</span>
            <span>Lancamentos manuais ilimitados</span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-600">✓</span>
            <span>Importacao de extrato OFX/CSV/PDF</span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-600">✓</span>
            <span>Captura de nota com IA</span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-600">✓</span>
            <span>Leitura de QR de NFC-e</span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-600">✓</span>
            <span>Lembretes de DAS por email</span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-600">✓</span>
            <span>Alerta de desenquadramento MEI</span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-600">✓</span>
            <span>Reserva automatica de impostos</span>
          </li>
          <li className="flex gap-2">
            <span className="text-violet-600">✓</span>
            <span>Orcamento por categoria</span>
          </li>
        </ul>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 text-sm text-red-700">
          {erro}
        </div>
      )}

      <button
        onClick={iniciarCheckout}
        disabled={loading}
        className="block w-full bg-violet-600 text-white text-center font-semibold py-3 rounded-2xl hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {loading ? 'Abrindo checkout...' : 'Quero o Pro'}
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Pagamento seguro pelo Stripe. Plano Free continua com 20 lancamentos
        manuais por mes.
      </p>
    </main>
  );
}
