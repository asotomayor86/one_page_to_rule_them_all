import type { MetadataRoute } from "next";

// Manifest del PWA del hub. Como los juegos viven debajo del hub a través de
// rewrites (gamehub.family/hangman, /assemble), el scope "/" cubre todo: el
// modo standalone se mantiene al navegar entre hub y juegos sin que el
// navegador re-pinte su chrome (también en iOS Safari).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hub de Juegos en Familia",
    short_name: "GameHub",
    description:
      "Hub familiar para abrir partidas, ver el ranking y las estadísticas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#1b1f2a",
    theme_color: "#1b1f2a",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
