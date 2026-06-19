'use client';

/**
 * Camera ao vivo com enquadramento. Renderiza o stream da camera traseira
 * direto na tela, mostra um quadro tracejado pra usuaria alinhar a nota e,
 * ao clicar no botao, captura um JPEG em 1280px (lado maior) com qualidade
 * 0.8 — fica geralmente sub-1MB, sem chance de estourar limite de upload.
 *
 * Por que nao usamos `<input capture>`: em iOS/Safari ele entrega o arquivo
 * sem feedback visual, em tamanho original (4-12MB). Aqui controlamos toda
 * a pipeline.
 */

import { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

const TARGET_LONG_EDGE = 1280;
const JPEG_QUALITY = 0.8;

export default function LiveCameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let cancelled = false;

    setError(null);
    setReady(false);

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);
      } catch (e: any) {
        const msg =
          e?.name === 'NotAllowedError'
            ? 'Voce precisa liberar a camera no navegador.'
            : e?.name === 'NotFoundError'
            ? 'Nenhuma camera disponivel neste dispositivo.'
            : e?.message ?? 'Nao consegui abrir a camera.';
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  async function tirar() {
    if (!ready || capturing) return;
    const video = videoRef.current;
    if (!video) return;

    setCapturing(true);
    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) {
        setError('Camera nao terminou de carregar. Tenta de novo.');
        return;
      }

      // Reduz pro lado maior <= TARGET_LONG_EDGE. Mantem proporcao.
      const ratio = Math.min(1, TARGET_LONG_EDGE / Math.max(vw, vh));
      const w = Math.round(vw * ratio);
      const h = Math.round(vh * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Navegador sem suporte a captura.');
        return;
      }
      ctx.drawImage(video, 0, 0, w, h);

      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY);
      });
      if (!blob) {
        setError('Falha ao gerar a imagem.');
        return;
      }

      const file = new File([blob], `nota-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      onCapture(file);
    } finally {
      setCapturing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <button
          onClick={onClose}
          className="text-2xl leading-none px-3 py-1 rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Fechar"
        >
          ×
        </button>
        <span className="text-sm font-medium">Enquadre a nota</span>
        <span className="w-8" />
      </div>

      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        {/* Overlay com quadro tracejado de enquadramento */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="border-2 border-dashed border-white/80 rounded-2xl w-[88%] aspect-[3/4] max-w-md shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/90 text-xs bg-black/40 px-3 py-1 rounded-full">
          Encaixe a nota inteira dentro do quadro
        </div>
      </div>

      <div className="p-6 flex justify-center">
        <button
          onClick={tirar}
          disabled={!ready || capturing}
          className="w-20 h-20 rounded-full border-4 border-white bg-white disabled:opacity-50 active:scale-95 transition shadow-lg flex items-center justify-center"
          aria-label="Tirar foto"
        >
          <span className="block w-14 h-14 rounded-full bg-white border-2 border-gray-300" />
        </button>
      </div>

      {error && (
        <div className="absolute bottom-32 left-4 right-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
