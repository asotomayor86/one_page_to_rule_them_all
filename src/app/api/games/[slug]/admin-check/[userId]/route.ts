/**
 * Comprobación servidor-a-servidor de si un usuario es administrador del hub
 * (`profiles.is_admin`). La usan juegos individuales sin sala (p. ej. Marvel
 * Trivia) para autorizar acciones de admin (borrar un intento) sin depender
 * de la Data API de Neon ni del JWT del jugador — mismo secreto compartido
 * que `/api/games/[slug]/result`.
 *
 * `slug` no cambia la respuesta (is_admin es global, no por juego): se exige
 * solo para mantener la misma forma de URL que el resto de endpoints de
 * juego y confirmar que el juego que pregunta está dado de alta.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, games, profiles } from "@/db";
import { autorizadoServidorAServidor } from "@/lib/game-auth";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> },
): Promise<NextResponse> {
  if (!autorizadoServidorAServidor(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: CORS });
  }

  const { slug, userId } = await params;

  const [juego] = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);
  if (!juego) {
    return NextResponse.json({ error: "Juego no encontrado" }, { status: 404, headers: CORS });
  }

  const [perfil] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return NextResponse.json({ isAdmin: perfil?.isAdmin === true }, { headers: CORS });
}
