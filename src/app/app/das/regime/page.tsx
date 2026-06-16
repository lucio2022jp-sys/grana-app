'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ANEXOS = [
  {
    value: 'III',
    label: 'Servicos comuns',
    emoji: '🛠️',
    descricao: 'Maioria dos autonomos cai aqui. Servicos de beleza, ensino, tecnologia.',
    exemplos: 'manicure, cabelo, dev, professor, fotografo, personal',
    aliquota: '6% a 33%',
    destaque: true,
  },
  {
    value: 'I',
    label: 'Comercio',
    emoji: '🏪',
    descricao: 'Voce vende produto fisico (revenda, lojinha, loja virtual).',
    exemplos: 'revendedora, sacoleira, lojinha, brecho',
    aliquota: '4% a 19%',
  },
  {
    value: 'IV',
    label: 'Servicos especificos',
    emoji: '🧹',
    descricao: 'Limpeza, conservacao, vigilancia, construcao, advocacia.',
    exemplos: 'diarista, faxineira, vigilante, advogado, pedreiro',
    aliquota: '4,5% a 33%',
  },
  {
    value: 'V',
    label: 'Servicos tecnicos',
    emoji: '📊',
    descricao: 'Consultoria, engenharia, auditoria.',
    exemplos: 'consultor, engenheiro, contador, jornalista',
    aliquota: '15,5% a 30,5%',
  },
];

export default function RegimePage() {
  const router = useRouter();
  const [step, setStep] = useState<'regime' | 'mei' | 'simples'>('regime');
  const [loading, setLoading] = useState(false);

  async function escolherRegime(regime: 'mei' | 'simples' | 'nenhum') {
    if (regime === 'nenhum') {
      setLoading(true);
      await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regime: 'nenhum' }),
      });
      router.push('/app/das');
      return;
    }
    if (regime === 'mei') setStep('mei');
    else setStep('simples');
  }

  async function escolherAtividadeMEI(atividade: string) {
    setLoading(true);
    await fetch('/api/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regime: 'mei', meiAtividade: atividade }),
    });
    router.push('/app/das');
  }

  async function escolherAnexoSimples(anexo: string) {
    setLoading(true);
    await fetch('/api/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regime: 'simples', simplesAnexo: anexo }),
    });
    router.push('/app/das');
  }

  if (step === 'regime') {
    return (
      <main className="flex-1 p-5">
        <button onClick={() => router.back()} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition">
          ←
        </button>

        <div className="text-center mb-6">
          <div className="text-6xl mb-3 animate-float">📋</div>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
            Qual seu <span className="bg-gradient-cool bg-clip-text text-transparent">regime</span>?
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Diz como voce paga imposto pra calcular o DAS certinho.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => escolherRegime('mei')}
            disabled={loading}
            className="w-full bg-gradient-cool text-white border-2 border-transparent rounded-3xl p-5 text-left transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-glow-cool relative animate-pop-in"
          >
            <div className="absolute -top-2 right-4 bg-yellow-300 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-soft">
              ⭐ MAIS COMUM
            </div>
            <div className="flex items-start gap-3">
              <span className="text-4xl shrink-0">📌</span>
              <div className="flex-1">
                <div className="font-bold text-xl mb-1">Sou MEI</div>
                <div className="text-blue-100 text-sm mb-2">
                  DAS fixo por mes. Limite de R$ 81.000/ano.
                </div>
                <div className="text-xs text-blue-100 font-medium">
                  R$ 76,90 a R$ 81,90/mes
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => escolherRegime('simples')}
            disabled={loading}
            className="w-full bg-white border-2 border-purple-300 hover:border-purple-500 rounded-3xl p-5 text-left transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-soft animate-pop-in"
            style={{ animationDelay: '60ms' }}
          >
            <div className="flex items-start gap-3">
              <span className="text-4xl shrink-0">📈</span>
              <div className="flex-1">
                <div className="font-bold text-xl text-gray-900 mb-1">Simples Nacional</div>
                <div className="text-gray-600 text-sm mb-2">
                  Voce passou do limite MEI. DAS calculado por percentual sobre faturamento.
                </div>
                <div className="text-xs text-purple-600 font-bold">
                  4% a 33% conforme faixa
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => escolherRegime('nenhum')}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-200 hover:border-gray-400 rounded-3xl p-5 text-left transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-soft animate-pop-in"
            style={{ animationDelay: '120ms' }}
          >
            <div className="flex items-start gap-3">
              <span className="text-4xl shrink-0">🌱</span>
              <div className="flex-1">
                <div className="font-bold text-xl text-gray-900 mb-1">Ainda nao formalizei</div>
                <div className="text-gray-600 text-sm">
                  So quero controlar minhas financas. Vou pensar no MEI depois.
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mt-6">
          <div className="flex items-start gap-2">
            <span className="text-xl shrink-0">💡</span>
            <div className="text-xs text-yellow-900 leading-relaxed">
              Se voce ja tem CNPJ MEI, escolha &quot;Sou MEI&quot;.
              Se passou de R$ 81.000 no ano, ja precisa estar no Simples.
              Da pra mudar depois.
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === 'mei') {
    const ATIVIDADES_MEI = [
      { value: 'servicos', label: 'Servicos', das: 80.90, emoji: '🛠️', exemplos: 'manicure, motorista, dev, professor', destaque: true },
      { value: 'comercio', label: 'Comercio', das: 76.90, emoji: '🏪', exemplos: 'revendedora, sacoleira, lojinha' },
      { value: 'industria', label: 'Industria', das: 76.90, emoji: '🏭', exemplos: 'confeiteira, costureira, marceneiro' },
      { value: 'comercio_servicos', label: 'Comercio + Servicos', das: 81.90, emoji: '🏪🛠️', exemplos: 'salao com cosmetico' },
    ];

    return (
      <main className="flex-1 p-5">
        <button onClick={() => setStep('regime')} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition">
          ←
        </button>

        <div className="text-center mb-6">
          <div className="text-5xl mb-2">📌</div>
          <h1 className="text-2xl font-extrabold text-gray-900">Qual sua atividade MEI?</h1>
          <p className="text-gray-600 mt-2 text-sm">Escolhe o que mais combina.</p>
        </div>

        <div className="space-y-3">
          {ATIVIDADES_MEI.map((a, i) => (
            <button
              key={a.value}
              onClick={() => escolherAtividadeMEI(a.value)}
              disabled={loading}
              className={`w-full bg-white border-2 rounded-2xl p-5 text-left transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 animate-pop-in relative ${
                a.destaque ? 'border-secondary-400 shadow-glow-cool' : 'border-gray-200 shadow-soft'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {a.destaque && (
                <div className="absolute -top-2 right-4 bg-gradient-cool text-white text-xs font-bold px-3 py-1 rounded-full">
                  ⭐ MAIS COMUM
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">{a.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="font-bold text-gray-900">{a.label}</div>
                    <div className="text-sm font-bold text-secondary-600 whitespace-nowrap">
                      R$ {a.das.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Ex: {a.exemplos}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // step === 'simples'
  return (
    <main className="flex-1 p-5">
      <button onClick={() => setStep('regime')} className="text-gray-500 mb-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition">
        ←
      </button>

      <div className="text-center mb-6">
        <div className="text-5xl mb-2">📈</div>
        <h1 className="text-2xl font-extrabold text-gray-900">Qual seu anexo?</h1>
        <p className="text-gray-600 mt-2 text-sm">
          Cada anexo tem aliquota diferente. Escolha o que combina.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {ANEXOS.map((a, i) => (
          <button
            key={a.value}
            onClick={() => escolherAnexoSimples(a.value)}
            disabled={loading}
            className={`w-full bg-white border-2 rounded-2xl p-5 text-left transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 animate-pop-in relative ${
              a.destaque ? 'border-secondary-400 shadow-glow-cool' : 'border-gray-200 shadow-soft'
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {a.destaque && (
              <div className="absolute -top-2 right-4 bg-gradient-cool text-white text-xs font-bold px-3 py-1 rounded-full">
                ⭐ MAIS COMUM
              </div>
            )}
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0">{a.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <div>
                    <div className="font-bold text-gray-900">Anexo {a.value}</div>
                    <div className="text-sm text-gray-700 font-medium">{a.label}</div>
                  </div>
                  <div className="text-xs font-bold text-purple-600 whitespace-nowrap">
                    {a.aliquota}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-1">{a.descricao}</div>
                <div className="text-xs text-gray-500">Ex: {a.exemplos}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <span className="text-xl shrink-0">💡</span>
          <div className="text-xs text-yellow-900 leading-relaxed">
            <span className="font-bold">Nao tem certeza?</span> A maioria dos autonomos esta no Anexo III.
            Se voce tem duvida, fale com seu contador. O app calcula correto baseado no que voce escolher.
          </div>
        </div>
      </div>
    </main>
  );
}
