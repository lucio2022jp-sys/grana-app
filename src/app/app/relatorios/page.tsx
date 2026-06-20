'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type MesDisponivel = {
  year: number;
  month: number;
  receita: number;
  despesa: number;
  lucro: number;
  txCount: number;
  generatedAt?: string;
};

type Contador = {
  nome?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Limpa um numero de telefone deixando so digitos com 55 na frente se nao tiver.
 */
function normalizeWhatsapp(raw: string): string {
  let n = raw.replace(/\D/g, '');
  if (!n.startsWith('55') && n.length >= 10) n = '55' + n;
  return n;
}

export default function RelatoriosPage() {
  const router = useRouter();
  const [meses, setMeses] = useState<MesDisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState<string | null>(null);
  const [contador, setContador] = useState<Contador | null>(null);
  const [salvos, setSalvos] = useState<{
    id: string;
    year: number;
    month: number;
    receita: number;
    despesas: number;
    lucro: number;
    txCount: number;
    geradoAuto: boolean;
    geradoEm: string;
    signedUrl: string | null;
  }[]>([]);
  const [modalAberto, setModalAberto] = useState<{
    monthStr: string;
    year: number;
    month: number;
    fileName: string;
    pdfBlob: Blob;
    nomeUser: string;
  } | null>(null);
  const [qrModal, setQrModal] = useState<{ url: string; qrDataUrl: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    // Pega dados do user
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUserId(d.user.id);
          setContador({
            nome: d.user.contadorNome,
            whatsapp: d.user.contadorWhatsapp,
            email: d.user.contadorEmail,
          });
        }
      });

    // Pega relatorios ja salvos no servidor (gerados automaticamente ou
    // sob demanda anterior)
    fetch('/api/relatorios-salvos')
      .then((r) => r.json())
      .then((d) => setSalvos(d.relatorios ?? []))
      .catch(() => {});

    // Lista de meses com transacoes
    const now = new Date();
    const lista: MesDisponivel[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      try {
        const res = await fetch(`/api/dashboard?month=${month}`);
        const data = await res.json();
        if (!data.empty) {
          lista.push({
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            receita: data.receita,
            despesa: data.despesas,
            lucro: data.sobrou,
            txCount: data.txCount,
            generatedAt: localStorage.getItem(`relatorio_${month}_geradoEm`) ?? undefined,
          });
        }
      } catch (e) {
        // ignora
      }
    }
    setMeses(lista);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function gerarPDFBlob(year: number, month: number) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const res = await fetch(`/api/relatorio?month=${monthStr}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'erro');
    const { gerarRelatorioPDF } = await import('@/lib/report-pdf');
    const doc = gerarRelatorioPDF(data);
    const fileName = `Relatorio_${data.user.name?.replace(/\s+/g, '_') ?? 'cliente'}_${MESES[month - 1]}_${year}.pdf`;
    const blob = doc.output('blob');
    return { doc, blob, fileName, nomeUser: data.user.name ?? 'cliente' };
  }

  async function abrirEnvio(year: number, month: number) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    setGerando(monthStr);
    try {
      const { blob, fileName, nomeUser } = await gerarPDFBlob(year, month);
      localStorage.setItem(`relatorio_${monthStr}_geradoEm`, new Date().toISOString());
      setModalAberto({ monthStr, year, month, fileName, pdfBlob: blob, nomeUser });
    } catch (e: any) {
      alert('Erro: ' + (e.message ?? 'desconhecido'));
    }
    setGerando(null);
    load();
  }

  async function baixar(year: number, month: number) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    setGerando(monthStr);
    try {
      const { doc, fileName } = await gerarPDFBlob(year, month);
      doc.save(fileName);
      localStorage.setItem(`relatorio_${monthStr}_geradoEm`, new Date().toISOString());
      // Tambem dispara o salvamento server-side em paralelo (nao bloqueante).
      // Se storage nao tiver configurado, o backend so salva o snapshot.
      fetch('/api/relatorios-salvos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      }).catch(() => {});
    } catch (e: any) {
      alert('Erro: ' + (e.message ?? 'desconhecido'));
    }
    setGerando(null);
    load();
  }

  async function abrirQR() {
    if (!userId) {
      alert('Aguarde os dados carregarem...');
      return;
    }
    const url = `${window.location.origin}/relatorio-publico/${userId}`;
    const QRCode = (await import('qrcode')).default;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    });
    setQrModal({ url, qrDataUrl });
  }

  if (loading) {
    return (
      <main className="flex-1 p-5">
        <div className="text-gray-400">Carregando...</div>
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
        <h1 className="text-2xl font-extrabold text-gray-900">📊 Relatorios</h1>
        <p className="text-sm text-gray-500">
          Relatorio mensal de receitas — voce e obrigada por lei a guardar isso.
          Tambem serve pra mandar pro contador, se tiver.
        </p>
        <button
          onClick={abrirQR}
          disabled={!userId}
          className="mt-3 inline-flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-secondary-400 text-gray-800 font-semibold py-2 px-3 rounded-xl text-xs transition active:scale-95 disabled:opacity-50"
        >
          🔗 QR pro contador
        </button>
      </div>

      {/* Status do contador */}
      {contador?.nome ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">👨‍💼</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-green-900 text-sm truncate">
                Contador: {contador.nome}
              </div>
              <div className="text-xs text-green-700">
                {contador.whatsapp && '📱 ' + contador.whatsapp}
                {contador.whatsapp && contador.email && ' · '}
                {contador.email && '📧 ' + contador.email}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Relatorios salvos automaticamente (cron mensal dia 5).
          Mostra um banner explicativo + os PDFs salvos no servidor. */}
      {salvos.length > 0 && (
        <div className="mb-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-3">
            <div className="text-xs text-emerald-900 leading-relaxed">
              <span className="font-bold">📚 Salvos automaticamente:</span> todo
              dia 5, o app gera o relatorio do mes anterior e guarda aqui pra
              voce. Sao copias permanentes.
            </div>
          </div>
          <div className="space-y-2">
            {salvos.map((s) => {
              const monthLabel = `${MESES[s.month - 1]} ${s.year}`;
              return (
                <div
                  key={s.id}
                  className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3"
                >
                  <span className="text-xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 capitalize">
                      {monthLabel}
                      {s.geradoAuto && (
                        <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                          auto
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Receita {brl(s.receita)} · Lucro {brl(s.lucro)} ·{' '}
                      Gerado {new Date(s.geradoEm).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  {s.signedUrl ? (
                    <a
                      href={s.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 whitespace-nowrap"
                    >
                      📥 Baixar
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">PDF nao disponivel</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {meses.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 animate-float">📥</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Sem transacoes ainda
          </h2>
          <p className="text-sm text-gray-600 mb-6 px-6">
            Importe um extrato pra gerar seu primeiro relatorio.
          </p>
          <Link
            href="/onboarding/upload"
            className="inline-block bg-gradient-cool text-white font-bold py-4 px-8 rounded-3xl shadow-glow-cool"
          >
            Importar extrato
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {meses.map((m) => {
            const monthStr = `${m.year}-${String(m.month).padStart(2, '0')}`;
            const isGerando = gerando === monthStr;
            return (
              <div
                key={monthStr}
                className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-bold text-lg text-gray-900 capitalize">
                      {MESES[m.month - 1]} {m.year}
                    </div>
                    <div className="text-xs text-gray-500">
                      {m.txCount} {m.txCount === 1 ? 'transacao' : 'transacoes'}
                      {m.generatedAt && ` · gerado em ${new Date(m.generatedAt).toLocaleDateString('pt-BR')}`}
                    </div>
                  </div>
                  {m.generatedAt && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold whitespace-nowrap">
                      ✓ ja gerado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-green-50 rounded-xl p-2">
                    <div className="text-xs text-green-700 font-semibold">Receita</div>
                    <div className="text-sm font-bold text-green-800">{brl(m.receita)}</div>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-2">
                    <div className="text-xs text-orange-700 font-semibold">Despesa</div>
                    <div className="text-sm font-bold text-orange-800">{brl(m.despesa)}</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-2">
                    <div className="text-xs text-purple-700 font-semibold">Lucro</div>
                    <div className="text-sm font-bold text-purple-800">{brl(m.lucro)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => baixar(m.year, m.month)}
                    disabled={isGerando}
                    className="bg-white border-2 border-gray-300 hover:border-secondary-400 text-gray-800 font-semibold py-3 rounded-xl text-sm transition active:scale-95 disabled:opacity-50"
                  >
                    {isGerando ? '⏳' : '⬇️ Baixar PDF'}
                  </button>
                  <button
                    onClick={() => abrirEnvio(m.year, m.month)}
                    disabled={isGerando}
                    className="bg-gradient-cool text-white font-bold py-3 rounded-xl text-sm shadow-glow-cool transition active:scale-95 disabled:opacity-50"
                  >
                    {isGerando ? '⏳ Gerando...' : '📤 Enviar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-6">
        <div className="flex items-start gap-2">
          <span className="text-xl shrink-0">💡</span>
          <div className="text-xs text-blue-800 leading-relaxed">
            <span className="font-bold">O relatorio mensal e obrigatorio por lei</span> —
            voce precisa guardar pra mostrar a Receita se ela pedir. O PDF tem
            tudo organizado: receitas, despesas dedutiveis, DAS e observacoes.
            Se voce tem contador, da pra mandar direto via WhatsApp ou email.
          </div>
        </div>
      </div>

      {/* Modal de envio */}
      {modalAberto && (
        <ModalEnvio
          modal={modalAberto}
          contador={contador}
          onClose={() => setModalAberto(null)}
        />
      )}

      {/* Modal QR pro contador */}
      {qrModal && (
        <ModalQR
          url={qrModal.url}
          qrDataUrl={qrModal.qrDataUrl}
          contador={contador}
          onClose={() => setQrModal(null)}
        />
      )}
    </main>
  );
}

function ModalQR({
  url,
  qrDataUrl,
  contador,
  onClose,
}: {
  url: string;
  qrDataUrl: string;
  contador: Contador | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Nao consegui copiar. Selecione e copie manualmente.');
    }
  }

  function compartilharWhatsapp() {
    if (!contador?.whatsapp) {
      alert('Cadastre o whatsapp do seu contador primeiro.');
      return;
    }
    const numero = contador.whatsapp.replace(/\D/g, '');
    const numeroFinal = numero.startsWith('55') ? numero : '55' + numero;
    const msg = encodeURIComponent(
      `Oi! Esse e o link do meu relatorio mensal pelo Grana, sempre atualizado:\n\n${url}\n\nQualquer mes que vc precisar, e so abrir esse link.`,
    );
    window.open(`https://wa.me/${numeroFinal}?text=${msg}`, '_blank');
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">🔗 Link pro contador</h2>
              <p className="text-xs text-gray-500 mt-1">
                Mande uma vez. Sempre que ele acessar, ve o relatorio atualizado.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex items-center justify-center">
            <img src={qrDataUrl} alt="QR code" className="w-64 h-64" />
          </div>

          <div className="bg-gray-100 rounded-xl p-3 mb-3 break-all text-xs text-gray-700 font-mono">
            {url}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={copiar}
              className="bg-white border-2 border-gray-300 hover:border-secondary-400 text-gray-800 font-semibold py-3 rounded-xl text-sm transition active:scale-95"
            >
              {copied ? '✓ Copiado!' : '📋 Copiar link'}
            </button>
            <button
              onClick={compartilharWhatsapp}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-sm transition active:scale-95"
            >
              📱 Whatsapp
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
            <span className="font-bold">Como funciona:</span> o contador acessa esse link
            sempre que precisar e ve seu relatorio do mes atual, com receitas, despesas
            dedutiveis, DAS e tudo mais. Tambem da pra imprimir/salvar em PDF.
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalEnvio({
  modal,
  contador,
  onClose,
}: {
  modal: {
    monthStr: string;
    year: number;
    month: number;
    fileName: string;
    pdfBlob: Blob;
    nomeUser: string;
  };
  contador: Contador | null;
  onClose: () => void;
}) {
  const periodo = `${MESES[modal.month - 1]} ${modal.year}`;
  const mensagemBase = `Oi! Segue o relatorio de ${periodo} - ${modal.nomeUser}. Qualquer coisa avisa!`;

  function baixarLocal() {
    const url = URL.createObjectURL(modal.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = modal.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function compartilhar() {
    try {
      const file = new File([modal.pdfBlob], modal.fileName, { type: 'application/pdf' });
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({
          files: [file],
          title: `Relatorio ${periodo}`,
          text: mensagemBase,
        });
      } else {
        baixarLocal();
        alert('Compartilhamento direto nao disponivel nesse navegador. PDF baixado.');
      }
    } catch (e) {
      // ignorou
    }
  }

  function abrirWhatsapp() {
    if (!contador?.whatsapp) return;
    const numero = normalizeWhatsapp(contador.whatsapp);
    // Baixa o PDF primeiro porque o WhatsApp Web nao aceita anexo via URL
    baixarLocal();
    const msg = encodeURIComponent(
      `${mensagemBase}\n\n(O PDF foi baixado no seu dispositivo - anexa essa mensagem)`,
    );
    setTimeout(() => {
      window.open(`https://wa.me/${numero}?text=${msg}`, '_blank');
    }, 500);
  }

  function abrirEmail() {
    if (!contador?.email) return;
    baixarLocal();
    const subj = encodeURIComponent(`Relatorio ${periodo} - ${modal.nomeUser}`);
    const body = encodeURIComponent(
      `${mensagemBase}\n\nO arquivo foi baixado - anexar a este email.\n\n--\nGerado pelo app Grana`,
    );
    setTimeout(() => {
      window.open(`mailto:${contador.email}?subject=${subj}&body=${body}`, '_blank');
    }, 500);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ animationDuration: '0.3s' }}
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

        <h2 className="text-xl font-extrabold text-gray-900 mb-1">📤 Enviar relatorio</h2>
        <p className="text-sm text-gray-500 mb-5">
          {periodo} · {modal.fileName}
        </p>

        {contador?.nome ? (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 mb-4 flex items-center gap-2">
            <span className="text-xl">👨‍💼</span>
            <div className="text-sm">
              <div className="font-bold text-purple-900">{contador.nome}</div>
              <div className="text-xs text-purple-700">seu contador cadastrado</div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 mb-4 text-xs text-gray-700">
            💡 Voce pode mandar pra qualquer pessoa via WhatsApp, email ou outro app.
            Se tem um contador, da pra cadastrar ele no perfil pra enviar com 1 toque.
          </div>
        )}

        <div className="space-y-2">
          {/* WhatsApp do contador */}
          {contador?.whatsapp && (
            <button
              onClick={abrirWhatsapp}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-95"
            >
              📱 Enviar pro WhatsApp do contador
            </button>
          )}

          {/* Email do contador */}
          {contador?.email && (
            <button
              onClick={abrirEmail}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-95"
            >
              📧 Enviar pro email do contador
            </button>
          )}

          {/* Compartilhar genérico */}
          <button
            onClick={compartilhar}
            className="w-full bg-gradient-cool text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-95"
          >
            📲 Compartilhar (outros apps)
          </button>

          {/* Download */}
          <button
            onClick={baixarLocal}
            className="w-full bg-white border-2 border-gray-300 text-gray-800 font-semibold py-4 rounded-2xl transition active:scale-95"
          >
            ⬇️ So baixar
          </button>
        </div>

        {!contador?.whatsapp && !contador?.email && (
          <Link
            href="/app/perfil"
            className="block text-center text-xs text-secondary-600 underline mt-4"
          >
            + Cadastrar contador no perfil
          </Link>
        )}

        <button
          onClick={onClose}
          className="w-full text-gray-500 py-3 mt-2 text-sm"
        >
          Cancelar
        </button>

        <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed">
          ⚠️ O PDF vai ser baixado no seu dispositivo. Anexa na mensagem do WhatsApp ou email.
        </p>
      </div>
    </div>
  );
}
