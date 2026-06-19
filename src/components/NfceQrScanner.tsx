'use client';

/**
 * Leitor de QR Code de NFC-e (cupom fiscal eletronico).
 *
 * Por que existe: tirar foto + IA-visao funciona, mas a NFC-e ja traz um QR
 * com link pra SEFAZ que tem TODOS os dados estruturados. Eh mais barato (zero
 * tokens) e mais preciso. So caimos em IA quando o QR nao for legivel.
 *
 * Estrategia de leitura:
 *   1. Tenta `BarcodeDetector` nativo (Chrome Android, Safari 17+). Rapido,
 *      sem dependencia.
 *   2. Fallback: ZXing browser (`@zxing/browser`) que carrega ~150KB mas roda
 *      em qualquer navegador moderno.
 *
 * Quando le, manda o conteudo pra POST /api/notes/nfce que faz o scrape no
 * portal da SEFAZ. Devolvemos os dados pro componente pai via callback.
 */

import { useEffect, useRef, useState } from 'react';

export type NfceResult = {
  chave: string;
  uf: string;
  emitente?: { cnpj?: string; nome?: string };
  emitidaEm?: string;
  total?: number;
  itens: { descricao: string; quantidade: number; valorTotal: number }[];
  fallback: boolean;
  sourceUrl: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onResult: (n: NfceResult) => void;
};

declare global {
  interface Window {
    // @ts-ignore — BarcodeDetector ainda nao tem tipo no lib.dom de todos os TS.
    BarcodeDetector?: any;
  }
}

export default function NfceQrScanner({ open, onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'fetching'>('idle');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStatus('scanning');

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const onContent = async (raw: string) => {
          stopRef.current();
          setStatus('fetching');
          try {
            const res = await fetch('/api/notes/nfce', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ qr: raw }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'falhou');
            onResult(data.nfce);
          } catch (e: any) {
            setError(e?.message || 'Nao consegui ler.');
            setStatus('idle');
          }
        };

        // Caminho 1: BarcodeDetector nativo.
        if (window.BarcodeDetector) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          let active = true;
          stopRef.current = () => {
            active = false;
            stream.getTracks().forEach((t) => t.stop());
          };
          const tick = async () => {
            if (!active || cancelled) return;
            try {
              const codes = await detector.detect(video);
              if (codes && codes[0]?.rawValue) {
                await onContent(codes[0].rawValue);
                return;
              }
            } catch {
              // ignora frame ruim, segue.
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          return;
        }

        // Caminho 2: fallback ZXing.
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromVideoElement(
          video,
          (result, _err) => {
            if (cancelled) return;
            if (result) {
              onContent(result.getText());
            }
          },
        );
        stopRef.current = () => {
          controls.stop();
          stream.getTracks().forEach((t) => t.stop());
        };
      } catch (e: any) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Voce precisa liberar a camera.'
            : e?.message || 'Nao consegui abrir a camera.',
        );
        setStatus('idle');
      }
    }
    start();

    return () => {
      cancelled = true;
      stopRef.current();
    };
  }, [open, onResult]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-bold text-lg text-gray-900">📷 Ler QR da nota</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none px-2"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600">
            Aponta a camera pro QR Code do cupom. A gente busca os dados direto na SEFAZ — sem IA, sem chute.
          </p>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-8 border-4 border-white/70 rounded-2xl pointer-events-none" />
          </div>
          {status === 'fetching' && (
            <div className="text-center text-sm text-gray-700">
              <span className="animate-pulse">🔎</span> Consultando SEFAZ...
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
