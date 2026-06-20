'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CapturarNotaButton from '@/components/CapturarNotaButton';

const PROFISSOES = [
  { value: 'manicure', label: 'Manicure / Pedicure', emoji: '💅' },
  { value: 'cabelo', label: 'Cabelo / Barbeiro', emoji: '💇' },
  { value: 'estetica', label: 'Estetica / Sobrancelha', emoji: '✨' },
  { value: 'massagem', label: 'Massagem / Spa', emoji: '💆' },
  { value: 'maquiagem', label: 'Maquiadora', emoji: '💄' },
  { value: 'motorista', label: 'Motorista de app', emoji: '🚗' },
  { value: 'entregador', label: 'Entregador', emoji: '🛵' },
  { value: 'professor', label: 'Professor particular', emoji: '📚' },
  { value: 'personal', label: 'Personal trainer', emoji: '💪' },
  { value: 'faxineira', label: 'Diarista / Faxineira', emoji: '🧹' },
  { value: 'cozinheira', label: 'Cozinheira / Confeitaria', emoji: '👩‍🍳' },
  { value: 'freelancer', label: 'Freelancer / Designer', emoji: '🎨' },
  { value: 'dev', label: 'Programador / Dev', emoji: '💻' },
  { value: 'fotografo', label: 'Fotografo / Filmmaker', emoji: '📸' },
  { value: 'creator', label: 'Criador de conteudo', emoji: '🎬' },
  { value: 'costureira', label: 'Costureira', emoji: '🧵' },
  { value: 'mecanico', label: 'Mecanico / Tecnico', emoji: '🔧' },
  { value: 'vendedor', label: 'Vendedor / Revendedor', emoji: '🛍️' },
  { value: 'outros', label: 'Outros', emoji: '🌟' },
];

export default function PerfilPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profissao, setProfissao] = useState('');
  const [meiAtividade, setMeiAtividade] = useState('');
  const [contadorNome, setContadorNome] = useState('');
  const [contadorWhatsapp, setContadorWhatsapp] = useState('');
  const [contadorEmail, setContadorEmail] = useState('');
  const [reminderDas, setReminderDas] = useState(true);
  const [reminderInactivity, setReminderInactivity] = useState(true);
  const [saved, setSaved] = useState(false);
  // Bloco do contador fica fechado por padrao. So abre se ja tem dado
  // cadastrado, ou se a usuaria clicar pra expandir. MEI puro nao precisa.
  const [contadorOpen, setContadorOpen] = useState(false);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setName(d.user.name ?? '');
          setEmail(d.user.email ?? '');
          setProfissao(d.user.profissao ?? '');
          setMeiAtividade(d.user.meiAtividade ?? '');
          setContadorNome(d.user.contadorNome ?? '');
          setContadorWhatsapp(d.user.contadorWhatsapp ?? '');
          setContadorEmail(d.user.contadorEmail ?? '');
          // Abre automaticamente se ja tem dado salvo
          if (d.user.contadorNome || d.user.contadorWhatsapp || d.user.contadorEmail) {
            setContadorOpen(true);
          }
          setReminderDas(d.user.reminderDasEnabled ?? true);
          setReminderInactivity(d.user.reminderInactivityEnabled ?? true);
        }
      });
  }, []);

  async function salvar() {
    setSaved(false);
    await fetch('/api/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email: email || undefined,
        profissao,
        meiAtividade: meiAtividade || undefined,
        contadorNome: contadorNome || undefined,
        contadorWhatsapp: contadorWhatsapp || undefined,
        contadorEmail: contadorEmail || '',
        reminderDasEnabled: reminderDas,
        reminderInactivityEnabled: reminderInactivity,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <main className="flex-1 p-5">
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto mb-3 bg-gradient-pink rounded-full flex items-center justify-center text-4xl shadow-glow-pink">
          👤
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Meu perfil</h1>
      </div>

      <div className="space-y-4 mb-6">
        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-2">Nome</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 shadow-soft transition"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-2">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 shadow-soft transition"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-2">Profissao</span>
          <select
            value={profissao}
            onChange={(e) => setProfissao(e.target.value)}
            className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 shadow-soft transition"
          >
            <option value="">Selecione</option>
            {PROFISSOES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.emoji} {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-2">Atividade MEI (DAS)</span>
          <select
            value={meiAtividade}
            onChange={(e) => setMeiAtividade(e.target.value)}
            className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-5 py-4 shadow-soft transition"
          >
            <option value="">Nao sou MEI</option>
            <option value="comercio">🏪 Comercio (R$ 76,90)</option>
            <option value="industria">🏭 Industria (R$ 76,90)</option>
            <option value="servicos">🛠️ Servicos (R$ 80,90)</option>
            <option value="comercio_servicos">🏪🛠️ Comercio + Servicos (R$ 81,90)</option>
          </select>
        </label>
      </div>

      {/* Secao do contador (opcional, fica recolhida por padrao).
          MEI puro nao precisa de contador, entao nao empurramos isso. */}
      <div className="bg-white border-2 border-gray-200 rounded-3xl mb-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setContadorOpen((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">👨‍💼</span>
            <div>
              <div className="font-semibold text-gray-900 text-sm">
                Contador {contadorNome ? `· ${contadorNome}` : '(opcional)'}
              </div>
              <div className="text-xs text-gray-500">
                {contadorOpen
                  ? 'Cadastre seu contador pra mandar relatorio direto pra ele.'
                  : 'Cadastre se tem contador. Toque pra abrir.'}
              </div>
            </div>
          </div>
          <span className={`text-gray-400 text-xl transition-transform ${contadorOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {contadorOpen && (
          <div className="px-5 pb-5 pt-1 space-y-3 border-t border-gray-100">
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 mb-1">Nome do contador</span>
              <input
                type="text"
                value={contadorNome}
                onChange={(e) => setContadorNome(e.target.value)}
                placeholder="Ex: Joao Silva"
                className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm shadow-sm transition"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp 📱</span>
              <input
                type="tel"
                inputMode="tel"
                value={contadorWhatsapp}
                onChange={(e) => setContadorWhatsapp(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm shadow-sm transition"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 mb-1">Email 📧</span>
              <input
                type="email"
                value={contadorEmail}
                onChange={(e) => setContadorEmail(e.target.value)}
                placeholder="contador@exemplo.com"
                className="w-full bg-white border-2 border-gray-200 focus:border-secondary-400 outline-none rounded-2xl px-4 py-3 text-sm shadow-sm transition"
              />
            </label>

            <p className="text-xs text-gray-500 leading-relaxed pt-1">
              Se cadastrar, o relatorio mensal pode ser enviado direto pra ele
              no WhatsApp ou email.
            </p>
          </div>
        )}
      </div>

      {/* Lembretes por email */}
      <div className="bg-pink-50 border-2 border-pink-200 rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🔔</span>
          <h2 className="font-bold text-gray-900">Lembretes por email</h2>
        </div>
        <p className="text-xs text-gray-600 mb-4">
          A gente avisa antes do DAS vencer e quando voce passa muito tempo sem registrar nada. Nada de spam.
        </p>

        <label className="flex items-center justify-between bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 mb-2 cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-gray-800">Vencimento do DAS</div>
            <div className="text-xs text-gray-500">Aviso ate 5 dias antes</div>
          </div>
          <input
            type="checkbox"
            checked={reminderDas}
            onChange={(e) => setReminderDas(e.target.checked)}
            className="h-5 w-5 accent-pink-500"
          />
        </label>

        <label className="flex items-center justify-between bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-gray-800">Inatividade</div>
            <div className="text-xs text-gray-500">Cutucada se passar 7 dias sem lancar</div>
          </div>
          <input
            type="checkbox"
            checked={reminderInactivity}
            onChange={(e) => setReminderInactivity(e.target.checked)}
            className="h-5 w-5 accent-pink-500"
          />
        </label>

        {!email && (
          <p className="text-xs text-amber-700 mt-3 leading-relaxed">
            ⚠️ Cadastre um email la em cima pra receber os lembretes.
          </p>
        )}
      </div>

      <button
        onClick={salvar}
        className="w-full bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool transition hover:scale-105 active:scale-95 mb-3 text-lg"
      >
        {saved ? '✓ Salvo!' : '💾 Salvar'}
      </button>

      <div className="mt-8 space-y-3">
        <CapturarNotaButton />
        <Link
          href="/app/relatorios"
          className="flex items-center gap-3 bg-gradient-cool text-white rounded-2xl p-4 transition shadow-glow-cool hover:scale-105 active:scale-95"
        >
          <span className="text-2xl">📊</span>
          <div className="flex-1">
            <span className="font-bold">Relatorio pro contador</span>
            <div className="text-xs text-blue-100">PDF organizado e profissional</div>
          </div>
          <span className="text-white">›</span>
        </Link>
        <Link
          href="/onboarding/upload"
          className="flex items-center gap-3 bg-white border border-gray-200 hover:border-secondary-400 rounded-2xl p-4 transition shadow-soft"
        >
          <span className="text-2xl">📄</span>
          <span className="text-gray-700 font-medium">Importar novo extrato</span>
        </Link>
        <Link
          href="/app/imports"
          className="flex items-center gap-3 bg-white border border-gray-200 hover:border-secondary-400 rounded-2xl p-4 transition shadow-soft"
        >
          <span className="text-2xl">📚</span>
          <span className="text-gray-700 font-medium">Historico de imports</span>
        </Link>
        <Link
          href="/app/recorrentes"
          className="flex items-center gap-3 bg-white border border-gray-200 hover:border-secondary-400 rounded-2xl p-4 transition shadow-soft"
        >
          <span className="text-2xl">🔁</span>
          <span className="text-gray-700 font-medium">Pagamentos recorrentes</span>
        </Link>
        <Link
          href="/app/evolucao"
          className="flex items-center gap-3 bg-white border border-gray-200 hover:border-secondary-400 rounded-2xl p-4 transition shadow-soft"
        >
          <span className="text-2xl">📈</span>
          <span className="text-gray-700 font-medium">Evolucao</span>
        </Link>
        <Link
          href="/app/parceiros"
          className="flex items-center gap-3 bg-white border border-gray-200 hover:border-secondary-400 rounded-2xl p-4 transition shadow-soft"
        >
          <span className="text-2xl">👨‍💼</span>
          <span className="text-gray-700 font-medium">Contadores parceiros</span>
        </Link>
        <Link
          href="/app/saude"
          className="flex items-center gap-3 bg-white border border-gray-200 hover:border-secondary-400 rounded-2xl p-4 transition shadow-soft"
        >
          <span className="text-2xl">🏥</span>
          <span className="text-gray-700 font-medium">Saude PF/PJ</span>
        </Link>
      </div>

      <button
        onClick={async () => {
          if (!confirm('Sair da conta? Seus dados ficam salvos no servidor, voce so precisa entrar de novo pra voltar.')) return;
          await fetch('/api/session/logout', { method: 'POST' });
          window.location.href = '/login';
        }}
        className="w-full mt-8 text-center text-sm text-red-500 hover:text-red-700 underline transition"
      >
        Sair do app
      </button>

      <p className="text-xs text-gray-400 text-center mt-6">
        Grana v0.1 — beta
      </p>
    </main>
  );
}
