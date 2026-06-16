"use client";

import { useEffect, useState } from "react";

// Evento beforeinstallprompt (solo Chromium/Android lo emite). No está en los
// tipos estándar de TS, así que lo declaramos aquí.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "hub-install-dismissed";

/** ¿La app ya corre instalada (standalone)? Entonces no ofrecemos instalar. */
function estaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari expone navigator.standalone.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** ¿Es iOS (iPhone/iPad)? Ahí no hay instalación programática, solo instrucciones. */
function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSClasico = /iPad|iPhone|iPod/.test(ua);
  // iPad moderno se identifica como Mac con pantalla táctil.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iOSClasico || iPadOS;
}

/**
 * Banner para instalar el hub como app (PWA), por si el usuario ignoró el aviso
 * nativo del navegador. En Android dispara el diálogo real de instalación; en
 * iOS muestra las instrucciones (Compartir → Añadir a pantalla de inicio).
 * Se puede cerrar y entonces no vuelve a aparecer (se recuerda en localStorage).
 */
export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [verAyudaIOS, setVerAyudaIOS] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (estaInstalada()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const iosDispositivo = esIOS();
    setIos(iosDispositivo);
    // En iOS no hay evento: mostramos el banner directamente (con instrucciones).
    if (iosDispositivo) {
      setVisible(true);
      return;
    }

    // Android/escritorio Chromium: capturamos el evento y lo guardamos para
    // dispararlo con nuestro botón.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Si se instala (desde nuestro botón o el nativo), ocultamos para siempre.
    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, "1");
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function cerrar() {
    setVisible(false);
    setVerAyudaIOS(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function instalar() {
    if (ios) {
      setVerAyudaIOS(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, "1");
    }
  }

  if (!visible) return null;

  return (
    <div className="install-banner" role="region" aria-label="Instalar la app">
      <div className="install-banner-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" aria-hidden="true" width={28} height={28} />
        <span className="install-banner-text">
          Instala GameHub en tu pantalla de inicio para abrirlo como una app.
        </span>
        <div className="install-banner-btns">
          <button type="button" className="install-banner-cta" onClick={instalar}>
            {ios ? "Cómo instalar" : "Instalar app"}
          </button>
          <button
            type="button"
            className="install-banner-close"
            aria-label="Cerrar"
            onClick={cerrar}
          >
            ✕
          </button>
        </div>
      </div>

      {ios && verAyudaIOS && (
        <ol className="install-banner-help">
          <li>
            Pulsa el botón <strong>Compartir</strong> de Safari (el cuadrado con
            la flecha hacia arriba).
          </li>
          <li>
            Elige <strong>Añadir a pantalla de inicio</strong>.
          </li>
          <li>
            Confirma con <strong>Añadir</strong>: GameHub aparecerá como una app.
          </li>
        </ol>
      )}
    </div>
  );
}
