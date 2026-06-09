/**
 * Proxy (antes "middleware") de Neon Auth: refresca la sesión y bloquea el
 * acceso a las rutas protegidas (hub, estadísticas, admin, perfil, cambiar
 * contraseña). Las páginas públicas de auth (login, recuperar, restablecer)
 * quedan fuera del `matcher`. En Next 16 este fichero se llama `proxy.ts`.
 *
 * getAuth() se invoca dentro de la función (no al cargar el módulo) para que el
 * build no exija las variables de entorno.
 */
import type { NextRequest } from "next/server";
import { getAuth } from "@/auth/server";

export default function proxy(request: NextRequest) {
  return getAuth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: [
    "/hub/:path*",
    "/estadisticas/:path*",
    "/admin/:path*",
    "/perfil/:path*",
    "/cambiar-password/:path*",
  ],
};
