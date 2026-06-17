'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Parceiro = {
  id: string;
  nome: string;
  foto: string | null;
  especialidade: string | null;
  cidade: string | null;
  preco: string | null;
  bio: string | null;
  notaMedia: number | null;
  notaCount: number;
};

export default function ParceirosPage() {
  const router = useRouter();
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/parceiros')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (cancelado) return;
        setParceiros(d.parceiros ?? []);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelado) return;
        setErro(e?.message ?? 'Erro ao carregar parceiros');
        setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function escolher(parceiroId: string) {
    setEscolhendo(parceiroId);
    try {
      const res = await fetch('/api/indicacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parceiroId }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error ?? 'Erro');
        setEscolhendo(null);
        return;
      }

      // Abre WhatsApp do parceiro com mensagem pronta
      if (d.whatsappUrl) {
        window.open(d.whatsappUrl, '_blank');
      }

      alert(`✓ Pronto! ${d.parceiro.nome} agora e seu contador. Voce ja pode mandar relatorios pra ele.`);
      router.push('/app/relatorios');
    } catch (e: any) {
      alert(e.message ?? 'erro');
      setEscolhendo(null);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Carregando...</div>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="flex-1 p-5">
        <button
          onClick={() => router.back()}
          className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center"
        >
          ←
        </button>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800">
          <p className="font-bold mb-1">Nao foi possivel carregar os parceiros</p>
          <p className="text-xs opacity-80 mb-3">{erro}</p>
          <button
            onClick={() => location.reload()}
            className="bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-lg"
          >
            Tentar de novo
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-5">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">👨‍💼 Contadores parceiros</h1>
        <p className="text-sm text-gray-500">
          Profissionais que cobram justo e atendem MEI direito.
        </p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-5">
        <div className="flex items-start gap-2">
          <span className="text-xl shrink-0">💡</span>
          <div className="text-xs text-purple-800 leading-relaxed">
            <span className="font-bold">Como funciona:</span> escolha um contador,
            o app abre uma conversa no WhatsApp dele com sua identificacao.
            Combine direto. Depois de 30 dias, voce avalia.
          </div>
        </div>
      </div>

      {parceiros.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Sem parceiros disponiveis
          </h2>
          <p className="text-sm text-gray-600 px-6">
            Estamos selecionando contadores parceiros. Em breve vai aparecer gente boa aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {parceiros.map((p) => (
            <div
              key={p.id}
              className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-soft"
            >
              <div className="flex items-start gap-3 mb-3">
                {p.foto ? (
                  <img
                    src={p.foto}
                    alt={p.nome}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-cool flex items-center justify-center text-3xl shrink-0">
                    👨‍💼
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-lg">{p.nome}</div>
                  <div className="text-xs text-gray-500">
                    {p.especialidade && <span>{p.especialidade}</span>}
                    {p.cidade && <span> · {p.cidade}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {p.notaCount >= 5 && p.notaMedia !== null ? (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-semibold">
                        ⭐ {p.notaMedia.toFixed(1)} ({p.notaCount} aval.)
                      </span>
                    ) : p.notaCount > 0 ? (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                        ⭐ {(p.notaMedia ?? 0).toFixed(1)} (poucas)
                      </span>
                    ) : (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold">
                        🆕 Novo
                      </span>
                    )}
                    {p.preco && (
                      <span className="text-xs text-gray-700 font-semibold">
                        {p.preco}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {p.bio && (
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  {p.bio}
                </p>
              )}

              <button
                onClick={() => escolher(p.id)}
                disabled={escolhendo === p.id}
                className="w-full bg-gradient-cool text-white font-bold py-3 rounded-2xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {escolhendo === p.id ? '⏳ Conectando...' : '📱 Falar pelo WhatsApp'}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
        Conhece um contador bom? Avise pelo perfil e a gente entra em contato pra
        avaliar a parceria.
      </p>
    </main>
  );
}
