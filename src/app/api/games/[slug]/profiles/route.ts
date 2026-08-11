/**
 * Resuelve nombres de perfil por id (servidor a servidor, mismo secreto que
 * el resto de endpoints de juego). Lo usan juegos individuales sin sala (p.
 * ej. el panel admin de Marvel Trivia) para mostrar nombres de jugador sin
 * depender de la Data API de Neon.
 */
import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
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
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  if (!autorizadoServidorAServidor(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: CORS });
  }

  const { slug } = await params;
  const [juego] = await db.select({ id: games.id }).from(games).where(eq(games.slug, slug)).limit(1);
  if (!juego) {
    return NextResponse.json({ error: "Juego no encontrado" }, { status: 404, headers: CORS });
  }

  const ids = new URL(request.url).searchParams
    .get("ids")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids || ids.length === 0) {
    return NextResponse.json({ perfiles: [] }, { headers: CORS });
  }

  const filas = await db
    .select({ id: profiles.id, displayName: profiles.displayName, nickname: profiles.nickname })
    .from(profiles)
    .where(inArray(profiles.id, ids));

  return NextResponse.json(
    { perfiles: filas.map((f) => ({ id: f.id, name: f.nickname || f.displayName })) },
    { headers: CORS },
  );
}
