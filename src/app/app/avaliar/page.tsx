'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Pendente = {
  indicacaoId: string;
  parceiro: {
    id: string;
    nome: string;
    foto: string | null;
    especialidade: string | null;
  };
  indicadoEm: string;
};

export default function AvaliarPage() {
  const router = useRouter();
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/avaliacoes');
    const d = await res.json();
    setPendentes(d.pendentes ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const atual = pendentes[idx];

  async function enviar() {
    if (!atual || !nota) return;
    setEnviando(true);
    const res = await fetch('/api/avaliacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parceiroId: atual.parceiro.id,
        nota,
        comentario: comentario.trim().slice(0, 200) || undefined,
      }),
    });
    setEnviando(false);
    if (res.ok) {
      // Avanca pro proximo
      setNota(null);
      setComentario('');
      if (idx + 1 < pendentes.length) {
        setIdx(idx + 1);
      } else {
        router.push('/app');
      }
    } else {
      const d = await res.json();
      alert(d.error ?? 'erro');
    }
  }

  function pular() {
    setNota(null);
    setComentario('');
    if (idx + 1 < pendentes.length) {
      setIdx(idx + 1);
    } else {
      router.push('/app');
    }
  }

  if (loading) {
    return <main className="flex-1 p-5"><div className="text-gray-400">Carregando...</div></main>;
  }

  if (pendentes.length === 0) {
    return (
      <main className="flex-1 p-5">
        <button onClick={() => router.back()} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center">
          ←
        </button>
        <div className="text-center mt-12">
          <div className="text-6xl mb-4">✨</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Tudo em dia</h1>
          <p className="text-sm text-gray-600">Voce nao tem avaliacoes pendentes.</p>
        </div>
      </main>
    );
  }

  if (!atual) return null;

  const diasDesde = Math.floor((Date.now() - new Date(atual.indicadoEm).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <main className="flex-1 p-5">
      <button onClick={() => router.back()} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center">
        ←
      </button>

      <div className="mb-2 text-xs font-semibold text-secondary-600">
        Avaliando {idx + 1} de {pendentes.length}
      </div>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">
        Como esta indo com seu contador?
      </h1>

      {/* Card do parceiro */}
      <div className="bg-white border-2 border-purple-100 rounded-3xl p-5 mb-6 shadow-soft">
        <div className="flex items-center gap-3 mb-2">
          {atual.parceiro.foto ? (
            <img src={atual.parceiro.foto} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-cool flex items-center justify-center text-2xl">
              👨‍💼
            </div>
          )}
          <div>
            <div className="font-bold text-gray-900 text-lg">{atual.parceiro.nome}</div>
            {atual.parceiro.especialidade && (
              <div className="text-xs text-gray-500">{atual.parceiro.especialidade}</div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              Voce conheceu ele faz {diasDesde} dias.
            </div>
          </div>
        </div>
      </div>

      {/* Estrelas */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-700 mb-3 font-semibold">De uma nota:</p>
        <div className="flex justify-center gap-2 mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setNota(n)}
              className={`text-5xl transition hover:scale-110 ${
                nota !== null && n <= nota ? '' : 'opacity-30'
              }`}
              aria-label={`${n} estrelas`}
            >
              ⭐
            </button>
          ))}
        </div>
        {nota && (
          <p className="text-sm font-medium text-gray-700">
            {nota === 1 && '😞 Muito ruim'}
            {nota === 2 && '😕 Ruim'}
            {nota === 3 && '🙂 Regular'}
            {nota === 4 && '😊 Bom'}
            {nota === 5 && '🤩 Otimo!'}
          </p>
        )}
      </div>

      {/* Comentario - aparece quando nota baixa */}
      {nota !== null && nota <= 3 && (
        <div className="mb-6 animate-pop-in">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-700 mb-2">
              O que aconteceu? (max 200 caracteres)
            </span>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Descreva brevemente o que foi ruim. So nos vemos isso, nao e publico."
              className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm shadow-sm"
            />
            <div className="text-xs text-gray-400 text-right mt-1">
              {comentario.length}/200
            </div>
          </label>
        </div>
      )}

      {nota !== null && nota >= 4 && (
        <div className="mb-6 animate-pop-in">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-700 mb-2">
              Algum elogio? (opcional)
            </span>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="O que voce gostou? (opcional)"
              className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm shadow-sm"
            />
          </label>
        </div>
      )}

      <button
        onClick={enviar}
        disabled={enviando || !nota}
        className="w-full bg-gradient-cool text-white font-bold py-4 rounded-2xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-50 mb-2"
      >
        {enviando ? '⏳ Enviando...' : '✓ Enviar avaliacao'}
      </button>

      <button onClick={pular} className="w-full text-gray-500 py-2 text-sm">
        Avaliar depois
      </button>

      <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
        Sua avaliacao e anonima pro contador. So a gente ve pra moderar parcerias.
      </p>
    </main>
  );
}
