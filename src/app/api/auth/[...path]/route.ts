/**
 * Handler de Neon Auth: expone /api/auth/* (login, sesión, reset, admin, etc.).
 * Neon Auth hace de proxy hacia el servidor configurado en NEON_AUTH_BASE_URL.
 */
import { auth } from "@/auth/server";

export const { GET, POST } = auth.handler();
