/**
 * Instancia de servidor de Neon Auth (Better Auth).
 *
 * Punto único para Server Components, Server Actions, Route Handlers y middleware.
 * Expone todos los métodos de Better Auth (signIn, getSession, admin.*, etc.),
 * más `.handler()` y `.middleware()`.
 *
 * El envío de correos (invitación / reseteo de contraseña) y el SMTP NO se
 * configuran aquí: se configuran a nivel de proyecto en Neon Auth (Consola o
 * API de Neon). Ver README.md.
 */
import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

if (!process.env.NEON_AUTH_BASE_URL) {
  throw new Error("Falta la variable de entorno NEON_AUTH_BASE_URL");
}
if (!process.env.NEON_AUTH_COOKIE_SECRET) {
  throw new Error("Falta la variable de entorno NEON_AUTH_COOKIE_SECRET");
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET,
  },
});
