/**
 * Instancia de servidor de Neon Auth (Better Auth).
 *
 * Punto único para Server Components, Server Actions, Route Handlers y proxy.
 * Expone todos los métodos de Better Auth (signIn, getSession, admin.*, etc.),
 * más `.handler()` y `.middleware()`.
 *
 * Se construye de forma PEREZOSA (en la primera petición), no al cargar el
 * módulo: así el build de Next no se rompe si las variables de entorno aún no
 * están configuradas. El error solo salta en tiempo de ejecución, con mensaje
 * claro, si de verdad faltan.
 *
 * El envío de correos (invitación / reseteo) y el SMTP NO se configuran aquí:
 * se configuran a nivel de proyecto en Neon Auth (Consola o API). Ver README.md.
 */
import "server-only";
import {
  createNeonAuth,
  type NeonAuth,
} from "@neondatabase/auth/next/server";

let instancia: NeonAuth | null = null;

/** Devuelve la instancia de Neon Auth, creándola la primera vez. */
export function getAuth(): NeonAuth {
  if (instancia) return instancia;

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl) throw new Error("Falta la variable de entorno NEON_AUTH_BASE_URL");
  if (!secret) {
    throw new Error("Falta la variable de entorno NEON_AUTH_COOKIE_SECRET");
  }

  // Si COOKIE_DOMAIN está definido (p. ej. ".familyhub.app"), las cookies de
  // Neon Auth se emiten con ese dominio y SameSite=Lax, lo que permite que
  // los juegos (subdominios como hangman.familyhub.app) hereden la sesión
  // del hub sin volver a pedir contraseña. Sin la variable, comportamiento
  // por defecto (cookie solo en el dominio del hub, SameSite=strict).
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const sameSite = domain ? "lax" : undefined;

  instancia = createNeonAuth({
    baseUrl,
    cookies: { secret, domain, sameSite },
  });
  return instancia;
}
