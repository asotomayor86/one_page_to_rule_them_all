/**
 * Endpoint público que consultan los juegos externos para resolver una sala por
 * su código. El código actúa como "llave": quien lo tiene puede leer la lista de
 * jugadores permitidos y el juego.
 *
 * La identidad la valida el PROPIO JUEGO (comparte Neon Auth): debe comprobar
 * que el `sub` del usuario logueado está en `players[].userId` antes de sentarlo.
 * Ver INTEGRACION-JUEGOS.md.
 */
import { NextResponse } from "next/server";
import { getRoomByCode } from "@/db/queries/rooms";

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
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code } = await params;
  const sala = await getRoomByCode(code.trim().toUpperCase());

  const caducada =
    sala?.expiresAt != null && new Date(sala.expiresAt).getTime() < Date.now();

  if (!sala || sala.status !== "open" || caducada) {
    return NextResponse.json(
      { error: "Sala no encontrada, cerrada o caducada" },
      { status: 404, headers: CORS },
    );
  }

  // A cuántas victorias se juega (best-of-N). El juego reinicia la partida
  // hasta que alguien llegue a `winsNeeded` y entonces devuelve a todos al hub.
  // Para salas sueltas el creador lo elige; para salas de liga se hereda de
  // la liga al crearlas.
  const league = sala.leagueId != null;

  return NextResponse.json(
    {
      code: sala.code,
      status: sala.status,
      league,
      winsNeeded: sala.winsNeeded,
      game: {
        slug: sala.game.slug,
        name: sala.game.name,
        url: sala.game.url,
      },
      players: sala.jugadores.map((j) => ({
        userId: j.userId,
        name: j.nombre,
        role: j.role,
      })),
    },
    { headers: CORS },
  );
}
