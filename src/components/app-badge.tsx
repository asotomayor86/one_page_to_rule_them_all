"use client";

import { useEffect } from "react";

/**
 * Pone (o quita) el "badge" numérico en el icono de la app instalada (PWA),
 * usando la Badging API del navegador. Solo funciona en navegadores que la
 * soportan (Chrome/Edge en escritorio y Android) y cuando la app está instalada;
 * en el resto no hace nada. El aviso visible siempre va también en la barra de
 * navegación.
 */
export function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count > 0) {
      nav.setAppBadge?.(count).catch(() => {});
    } else {
      nav.clearAppBadge?.().catch(() => {});
    }
  }, [count]);

  return null;
}
