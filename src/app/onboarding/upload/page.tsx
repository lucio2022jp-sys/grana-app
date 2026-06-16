'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

const BANCOS = [
  { nome: 'Nubank', emoji: '💜' },
  { nome: 'Caixa', emoji: '🟦' },
  { nome: 'Inter', emoji: '🟧' },
  { nome: 'Itau', emoji: '🟧' },
  { nome: 'BB', emoji: '🟨' },
  { nome: 'Bradesco', emoji: '🔴' },
  { nome: 'Santander', emoji: '❤️' },
  { nome: 'C6', emoji: '⚫' },
];

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro ao processar');
        setUploading(false);
        return;
      }

      const params = new URLSearchParams({ upload: data.uploadId });
      if (data.txCount !== undefined) params.set('novas', String(data.txCount));
      if (data.duplicadas !== undefined) params.set('duplicadas', String(data.duplicadas));
      router.push('/onboarding/processando?' + params.toString());
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado');
      setUploading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col px-5 pt-6 pb-12 bg-gradient-to-b from-white via-yellow-50/30 to-white">
      <button
        onClick={() => router.back()}
        className="text-gray-500 mb-6 text-left w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center hover:scale-110 transition"
      >
        ←
      </button>

      <div className="mb-2 text-sm font-semibold text-secondary-600">📎 Importar extrato</div>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
        Em <span className="bg-gradient-warning bg-clip-text text-transparent">30 segundos</span> ⚡
      </h1>
      <p className="text-gray-600 mb-6 text-sm">
        Tire o extrato Pix do seu banco e mande aqui.
      </p>

      <div className="space-y-3 mb-6">
        <div className="flex gap-3 bg-white rounded-2xl p-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
          <div className="bg-gradient-cool text-white font-bold w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-glow-cool">1</div>
          <div className="text-gray-800 pt-1.5 font-medium text-sm">Abre o app do seu banco</div>
        </div>
        <div className="flex gap-3 bg-white rounded-2xl p-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="bg-gradient-cool text-white font-bold w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-glow-cool">2</div>
          <div className="text-gray-800 pt-1.5 font-medium text-sm">Vai em &quot;Extrato&quot; → &quot;Compartilhar&quot; (PDF, OFX ou CSV)</div>
        </div>
        <div className="flex gap-3 bg-white rounded-2xl p-4 shadow-soft animate-slide-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
          <div className="bg-gradient-cool text-white font-bold w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-glow-cool">3</div>
          <div className="text-gray-800 pt-1.5 font-medium text-sm">Selecione o arquivo abaixo 👇</div>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-3">
        <p className="text-xs font-semibold text-purple-700 mb-2">🏦 Funciona com:</p>
        <div className="flex flex-wrap gap-2">
          {BANCOS.map((b) => (
            <span key={b.nome} className="bg-white rounded-full px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
              {b.emoji} {b.nome}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-6">
        <p className="text-xs text-green-800">
          <span className="font-bold">📄 Formatos aceitos:</span> PDF, OFX e CSV.
          OFX e CSV sao mais precisos quando o banco oferece.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf,.ofx,.qfx,.csv,.txt,application/x-ofx,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="bg-gradient-cool text-white font-bold py-5 rounded-3xl shadow-glow-cool transition hover:scale-105 active:scale-95 disabled:opacity-60 text-lg"
      >
        {uploading ? '⏳ Enviando...' : '📎 Escolher arquivo'}
      </button>

      {error && (
        <p className="text-red-600 text-sm mt-4 text-center bg-red-50 border border-red-200 rounded-xl p-3">
          {error}
        </p>
      )}

      <p className="text-xs text-gray-400 text-center mt-6">
        🔒 Seus dados ficam so com voce. Nunca compartilhamos.
      </p>
    </main>
  );
}
