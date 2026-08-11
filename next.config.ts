import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mantenemos la barra final en las URLs en lugar de quitarla con un 308.
  // Es necesario para los rewrites a los juegos (/hangman/, /assemble/): los
  // juegos usan rutas relativas para sus assets (fondo.jpg, etc.) que solo
  // resuelven bien cuando la URL del navegador termina en barra.
  trailingSlash: true,
  // Rewrites a los juegos hijos: gamehub.family/hangman/* y /assemble/* se
  // reenvían internamente a los proyectos correspondientes. Tienen que
  // declararse aquí (no en vercel.json) cuando el framework es Next.js,
  // porque vercel.json rewrites no se aplican en ese caso.
  async rewrites() {
    return {
      // beforeFiles: corren antes del filesystem/páginas de Next.js, así que
      // /hangman/ ya no choca con la inexistente página /hangman.
      beforeFiles: [
        {
          source: "/hangman/:path*",
          destination: "https://hangman.gamehub.family/:path*",
        },
        {
          source: "/assemble/:path*",
          destination: "https://assemble.gamehub.family/:path*",
        },
        {
          source: "/monopoly/:path*",
          destination: "https://monopoly.gamehub.family/:path*",
        },
        // Murcia Kingdom es Next.js (no una SPA): usa basePath="/murciakingdom",
        // así que CONSERVAMOS el prefijo en el destino (sus assets viven en
        // /murciakingdom/_next/...). Apuntamos a la URL canónica del proyecto en
        // Vercel (no a un subdominio propio, que habría que enganchar aparte).
        {
          source: "/murciakingdom/:path*",
          destination: "https://murcia-kingdom.vercel.app/murciakingdom/:path*",
        },
        // Ajedrez es Next.js con basePath="/ajedrez": CONSERVAMOS el prefijo en el
        // destino (sus assets viven en /ajedrez/_next/...). Apunta a la URL canónica
        // del proyecto chess en Vercel.
        {
          source: "/ajedrez/:path*",
          destination: "https://chess-delta-brown.vercel.app/ajedrez/:path*",
        },
        // Polysotopia es Next.js con basePath="/polysotopia": CONSERVAMOS el prefijo
        // en el destino (sus assets viven en /polysotopia/_next/...). Apunta a la URL
        // pública del proyecto en Vercel (el dominio limpio, que no está tras la
        // Protección de Vercel).
        {
          source: "/polysotopia/:path*",
          destination: "https://polysotopia.vercel.app/polysotopia/:path*",
        },
        // Marvel Trivia es Next.js con basePath="/marvel_trivia": CONSERVAMOS el
        // prefijo en el destino (sus assets viven en /marvel_trivia/_next/...).
        // Apunta al dominio limpio del proyecto en Vercel.
        {
          source: "/marvel_trivia/:path*",
          destination: "https://marvel-trivia.vercel.app/marvel_trivia/:path*",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // Nada especial por ahora. (No marcamos @neondatabase/auth como external:
  // necesita que el bundler resuelva sus imports internos como next/headers.)
};

export default nextConfig;
