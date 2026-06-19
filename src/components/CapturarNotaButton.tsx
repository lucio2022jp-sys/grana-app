'use client';

/**
 * Capturador de nota fiscal com IA.
 *
 * Fluxo:
 *   1. Usuaria clica no card -> abre o input camera (mobile) ou file picker.
 *   2. Foto vira preview + chamamos POST /api/notes/scan (Claude vision).
 *   3. Mostramos os campos extraidos pra revisar (valor, data, descricao,
 *      contraparte, tipo, categoria, dedutivel).
 *   4. Confirmar = POST /api/transactions e em seguida POST /attachment com a foto.
 *
 * O componente eh um modal que cobre a tela. Se algo falhar a usuaria sempre
 * pode editar manual o que foi extraido ou cancelar.
 */

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TX_TYPE_INFO, type TxType } from '@/lib/tx-types';

type Extracted = {
  valor: number;
  data: string;
  descricao: string;
  contraparte: string;
  type: TxType;
  category: string;
  isDeductible: boolean;
  isPersonal: boolean;
  confidence: number;
  reasoning: string;
};

type Step = 'idle' | 'analyzing' | 'review' | 'saving';

const CATEGORIAS_DESPESA = [
  'produto', 'equipamento', 'marketing', 'transporte', 'aluguel', 'servicos', 'curso', 'outros_trabalho',
];
const CATEGORIAS_PESSOAL = [
  'alimentacao', 'lazer', 'casa', 'saude', 'transporte_pessoal', 'familia', 'outros_pessoal',
];

export default function CapturarNotaButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep('idle');
    setFile(null);
    setExtracted(null);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function close() {
    reset();
    setOpen(false);
  }

  async function handleFile(f: File) {
    setError(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setStep('analyzing');

    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/notes/scan', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Falha ao analisar.');
        setStep('idle');
        return;
      }
      setExtracted(data.extracted);
      setStep('review');
    } catch (e: any) {
      setError(e?.message || 'Erro de rede.');
      setStep('idle');
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    handleFile(f);
  }

  async function confirmar() {
    if (!extracted || !file) return;
    setStep('saving');
    setError(null);

    try {
      // 1) cria a transacao
      const createRes = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: extracted.data,
          amount: extracted.valor,
          description: extracted.descricao,
          contraparte: extracted.contraparte || undefined,
          type: extracted.type,
          category: extracted.category,
          isDeductible: extracted.isDeductible,
          isPersonal: extracted.isPersonal,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setError(createData.error || 'Nao salvou. Tente de novo.');
        setStep('review');
        return;
      }

      // 2) sobe a foto como attachment (best-effort: se falhar, a tx ja existe)
      const txId = createData.transaction?.id;
      if (txId) {
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await fetch(`/api/transactions/${txId}/attachment`, {
          method: 'POST',
          body: fd,
        });
        if (!uploadRes.ok) {
          // Nao bloqueia: a transacao ja foi criada. So loga.
          console.warn('Anexo da nota nao foi salvo.');
        }
      }

      close();
      router.refresh();
      // Leva pra tela de transacoes pra mostrar a nova entrada.
      router.push('/app/transacoes');
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar.');
      setStep('review');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-gradient-pink text-white rounded-2xl p-4 transition shadow-glow-cool hover:scale-105 active:scale-95"
      >
        <span className="text-3xl">📸</span>
        <div className="flex-1 text-left">
          <div className="font-bold">Capturar nota com IA</div>
          <div className="text-xs text-pink-100">Tira foto e a gente classifica</div>
        </div>
        <span className="text-white text-xl">›</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={onPickFile}
      />

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="font-bold text-lg text-gray-900">📸 Capturar nota</h2>
              <button
                onClick={close}
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none px-2"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              {step === 'idle' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Tira uma foto da nota, do cupom fiscal ou do comprovante. A IA extrai os dados e
                    classifica automatico. Voce confere antes de salvar.
                  </p>
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="w-full bg-gradient-cool text-white font-bold py-5 rounded-2xl shadow-glow-cool hover:scale-105 active:scale-95 transition text-lg"
                  >
                    📷 Tirar foto / escolher imagem
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    Formatos: JPG, PNG ou WEBP. Maximo 8MB.
                  </p>
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {step === 'analyzing' && (
                <div className="text-center py-10">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Foto da nota"
                      className="max-h-48 mx-auto rounded-2xl shadow-soft mb-5"
                    />
                  )}
                  <div className="text-3xl mb-3 animate-pulse">🔍</div>
                  <div className="font-bold text-gray-900">Lendo a nota...</div>
                  <div className="text-xs text-gray-500 mt-1">Geralmente leva uns 5 segundos.</div>
                </div>
              )}

              {step === 'review' && extracted && (
                <div className="space-y-4">
                  {previewUrl && (
                    <details className="bg-gray-50 rounded-2xl p-3">
                      <summary className="cursor-pointer text-xs font-bold text-gray-700">
                        Ver foto enviada
                      </summary>
                      <img
                        src={previewUrl}
                        alt="Foto da nota"
                        className="max-h-64 mx-auto rounded-xl mt-3"
                      />
                    </details>
                  )}

                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3">
                    <div className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-1">
                      ✨ IA classificou
                    </div>
                    <div className="text-xs text-purple-900 leading-relaxed">
                      {extracted.reasoning || 'Confere os dados antes de salvar.'}
                    </div>
                    {extracted.confidence < 0.7 && (
                      <div className="text-xs text-purple-700 mt-2">
                        ⚠️ Confianca baixa. Vale revisar com calma.
                      </div>
                    )}
                  </div>

                  <Field
                    label="Valor (R$)"
                    value={extracted.valor.toFixed(2).replace('.', ',')}
                    onChange={(v) => {
                      const n = parseFloat(v.replace(',', '.'));
                      if (!isNaN(n)) setExtracted({ ...extracted, valor: n });
                    }}
                    inputMode="decimal"
                  />
                  <Field
                    label="Data"
                    type="date"
                    value={extracted.data}
                    onChange={(v) => setExtracted({ ...extracted, data: v })}
                  />
                  <Field
                    label="Descricao"
                    value={extracted.descricao}
                    onChange={(v) => setExtracted({ ...extracted, descricao: v })}
                  />
                  <Field
                    label="Estabelecimento"
                    value={extracted.contraparte}
                    onChange={(v) => setExtracted({ ...extracted, contraparte: v })}
                  />

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tipo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['receita', 'despesa', 'pessoal'] as TxType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setExtracted({
                              ...extracted,
                              type: t,
                              isPersonal: t === 'pessoal',
                              isDeductible: t === 'despesa',
                              category: t === 'receita'
                                ? 'cliente'
                                : t === 'despesa'
                                ? 'produto'
                                : 'alimentacao',
                            });
                          }}
                          className={`py-2 rounded-xl border-2 text-sm font-medium transition ${
                            extracted.type === t
                              ? 'bg-secondary-50 border-secondary-400 text-secondary-700'
                              : 'bg-white border-gray-200 text-gray-600'
                          }`}
                        >
                          {TX_TYPE_INFO[t].emoji} {TX_TYPE_INFO[t].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(extracted.type === 'despesa' || extracted.type === 'pessoal') && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Categoria</label>
                      <select
                        value={extracted.category}
                        onChange={(e) => setExtracted({ ...extracted, category: e.target.value })}
                        className="w-full border-2 border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:border-secondary-400 outline-none"
                      >
                        {(extracted.type === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_PESSOAL).map((c) => (
                          <option key={c} value={c}>
                            {c.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {extracted.type === 'despesa' && (
                    <label className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={extracted.isDeductible}
                        onChange={(e) => setExtracted({ ...extracted, isDeductible: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-green-800">
                        Despesa do trabalho (dedutivel)
                      </span>
                    </label>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={reset}
                      className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition"
                    >
                      Tirar outra
                    </button>
                    <button
                      onClick={confirmar}
                      className="flex-[2] bg-gradient-cool text-white font-bold py-3 rounded-2xl shadow-glow-cool hover:scale-105 active:scale-95 transition"
                    >
                      ✓ Salvar transacao
                    </button>
                  </div>
                </div>
              )}

              {step === 'saving' && (
                <div className="text-center py-10">
                  <div className="text-3xl mb-3 animate-pulse">💾</div>
                  <div className="font-bold text-gray-900">Salvando...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:border-secondary-400 outline-none"
      />
    </div>
  );
}
