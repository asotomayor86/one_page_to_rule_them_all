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
    // Un único SVG vale para todos los tamaños (Android Chrome lo escala). El
    // mismo archivo se declara como "any" (icono base) y como "maskable" (si el
    // sistema lo recorta con su propia máscara).
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
