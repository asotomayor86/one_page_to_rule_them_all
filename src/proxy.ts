/**
 * Proxy (antes "middleware") de Neon Auth: refresca la sesión y bloquea el
 * acceso a las rutas protegidas (hub, estadísticas, admin, perfil, cambiar
 * contraseña). Las páginas públicas de auth (login, recuperar, restablecer)
 * quedan fuera del `matcher`. En Next 16 este fichero se llama `proxy.ts`.
 */
import { auth } from "@/auth/server";

export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: [
    "/hub/:path*",
    "/estadisticas/:path*",
    "/admin/:path*",
    "/perfil/:path*",
    "/cambiar-password/:path*",
  ],
};
