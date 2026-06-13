/**
 * Handler de Neon Auth: expone /api/auth/* (login, sesión, reset, admin, etc.).
 * Neon Auth hace de proxy hacia el servidor configurado en NEON_AUTH_BASE_URL.
 *
 * Añadimos CORS para que los JUEGOS de la familia (otras apps en *.vercel.app, y
 * localhost en desarrollo) puedan iniciar sesión contra el hub vía SSO. Sin estas
 * cabeceras, el navegador bloquea la respuesta cross-origin ("Failed to fetch").
 * La protección CSRF la sigue haciendo Neon Auth con sus "trusted domains".
 *
 * getAuth() se invoca dentro de cada handler (no al cargar el módulo) para que el
 * build no exija las variables de entorno.
 */
import { getAuth } from "@/auth/server";

type Ctx = { params: Promise<{ path: string[] }> };

/** Devuelve el origen a reflejar en CORS si es un origen permitido, o null. */
function origenPermitido(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith(".vercel.app") || hostname === "localhost") {
      return origin;
    }
  } catch {
    /* origen mal formado */
  }
  return null;
}

/** Reconstruye la respuesta añadiendo las cabeceras CORS para el origen dado. */
function conCors(res: Response, origin: string | null): Response {
  if (!origin) return res;
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.append("Vary", "Origin");
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export async function OPTIONS(request: Request): Promise<Response> {
  const origin = origenPermitido(request);
  const headers = new Headers();
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      request.headers.get("access-control-request-headers") ||
        "Content-Type, Authorization",
    );
    headers.set("Access-Control-Max-Age", "86400");
    headers.append("Vary", "Origin");
  }
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  const res = await getAuth().handler().GET(request, ctx);
  return conCors(res, origenPermitido(request));
}

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  const res = await getAuth().handler().POST(request, ctx);
  return conCors(res, origenPermitido(request));
}
