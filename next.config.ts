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
        // Murcia Kingdom es Next.js (no una SPA): usa basePath="/murciakingdom",
        // así que CONSERVAMOS el prefijo en el destino (sus assets viven en
        // /murciakingdom/_next/...). Por eso no se reescribe como los de arriba.
        {
          source: "/murciakingdom/:path*",
          destination: "https://murciakingdom.gamehub.family/murciakingdom/:path*",
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
