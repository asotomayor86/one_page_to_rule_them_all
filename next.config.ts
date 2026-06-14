import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mantenemos la barra final en las URLs en lugar de quitarla con un 308.
  // Es necesario para los rewrites a los juegos (/hangman/, /assemble/): los
  // juegos usan rutas relativas para sus assets (fondo.jpg, etc.) que solo
  // resuelven bien cuando la URL del navegador termina en barra. Con el
  // valor por defecto (false) Next.js hacía /hangman/ → /hangman y eso
  // anulaba el rewrite a los proyectos hijos.
  trailingSlash: true,
  // Nada especial por ahora. (No marcamos @neondatabase/auth como external:
  // necesita que el bundler resuelva sus imports internos como next/headers.)
};

export default nextConfig;
