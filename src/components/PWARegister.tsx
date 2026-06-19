'use client';

import { useEffect, useState } from 'react';

/**
 * Registra o service worker e oferece um banner discreto de "instalar app".
 *
 * Comportamento:
 *   - Em prod, registra /sw.js no load. Em dev nao registra pra nao poluir
 *     o cache enquanto a gente edita.
 *   - Ouve `beforeinstallprompt` (Chrome / Android / desktop). Quando dispara,
 *     guarda o evento e mostra o banner. Usuaria que dispensa nao ve de novo
 *     por 30 dias (flag em localStorage).
 *   - iOS nao expoe `beforeinstallprompt`; pra Safari mobile a gente mostra
 *     uma dica curta "toque em compartilhar > adicionar a tela inicial",
 *     so se a app ainda nao tiver sido aberta em modo standalone.
 */
export default function PWARegister() {
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      const onLoad = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // Falha silenciosa: nao quebra o app se o SW nao puder registrar.
        });
      };
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissedAt = Number(localStorage.getItem('pwa.dismissedAt') || 0);
    const recentlyDismissed = Date.now() - dismissedAt < 30 * 24 * 60 * 60 * 1000;
    if (recentlyDismissed) return;

    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // @ts-ignore — propriedade nao-padrao do iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) return;

    const onPrompt = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS: detecta Safari mobile sem suporte a beforeinstallprompt.
    const ua = navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos) setShowIosHint(true);

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function handleInstall() {
    if (!installEvent) return;
    installEvent.prompt();
    installEvent.userChoice?.finally(() => {
      setInstallEvent(null);
      localStorage.setItem('pwa.dismissedAt', String(Date.now()));
    });
  }

  function handleDismiss() {
    setInstallEvent(null);
    setShowIosHint(false);
    localStorage.setItem('pwa.dismissedAt', String(Date.now()));
  }

  if (!installEvent && !showIosHint) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md rounded-2xl border-2 border-secondary-200 bg-white shadow-2xl p-4 flex items-center gap-3">
      <div className="text-2xl">📲</div>
      <div className="flex-1 text-sm">
        <div className="font-bold text-gray-900">Instalar Grana</div>
        <div className="text-xs text-gray-600 leading-snug">
          {installEvent
            ? 'Adicione na tela inicial pra abrir mais rapido.'
            : 'Toque em compartilhar e depois "Adicionar a tela inicial".'}
        </div>
      </div>
      {installEvent && (
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-xl bg-secondary-500 text-white text-sm font-bold px-4 py-2"
        >
          Instalar
        </button>
      )}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fechar"
        className="text-gray-400 text-lg leading-none px-1"
      >
        ×
      </button>
    </div>
  );
}
