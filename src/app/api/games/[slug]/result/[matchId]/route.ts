/**
 * Borra una partida individual registrada por `POST /api/games/[slug]/result`.
 * La usa el panel admin de juegos individuales (p. ej. Marvel Trivia) cuando un
 * admin borra el intento de un jugador: hay que quitarlo también del
 * ranking/historial del hub. `ON DELETE CASCADE` en `match_participants` se
 * lleva a sus participantes.
 */
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, games, matches } from "@/db";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Cache-Control": "no-store",
};

function autorizado(request: Request): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const secretos = [process.env.HUB_RESULT_SECRET, process.env.HUB_RESULT_SECRET_2];
  return secretos.some((s) => s && auth === `Bearer ${s}`);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; matchId: string }> },
): Promise<NextResponse> {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: CORS });
  }

  const { slug, matchId } = await params;

  const [juego] = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);
  if (!juego) {
    return NextResponse.json({ error: "Juego no encontrado" }, { status: 404, headers: CORS });
  }

  const borrada = await db
    .delete(matches)
    .where(and(eq(matches.id, matchId), eq(matches.gameId, juego.id)))
    .returning({ id: matches.id });

  if (borrada.length === 0) {
    return NextResponse.json({ error: "Partida no encontrada" }, { status: 404, headers: CORS });
  }

  return NextResponse.json({ ok: true }, { headers: CORS });
}
