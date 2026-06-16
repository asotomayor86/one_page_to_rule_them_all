/**
 * Endpoint para que un juego DEVUELVA el resultado de una partida jugada en una
 * sala. Lo llama el BACKEND del juego (servidor a servidor), autenticado con un
 * secreto compartido (HUB_RESULT_SECRET), no el navegador del jugador.
 *
 * El hub valida que los jugadores del resultado pertenecen a la sala, escribe la
 * partida (matches + match_participants) y cierra la sala. Ver INTEGRACION-JUEGOS.md.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  matchParticipants,
  matches,
  roomPlayers,
  rooms,
} from "@/db";
import { avanzarTorneo } from "@/db/queries/tournaments";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Cache-Control": "no-store",
};

const esquema = z.object({
  kind: z.enum(["practice", "ranked"]).default("ranked"),
  notes: z.string().trim().max(200).optional(),
  // Cierra la sala al recibir este resultado. El juego lo pone a true cuando
  // la serie (best-of-N) ha terminado, no en cada partida intermedia. Si no
  // viene, mantenemos el comportamiento histórico (cerrar solo si es liga).
  closeRoom: z.boolean().optional(),
  results: z
    .array(
      z.object({
        userId: z.string().min(1),
        result: z.enum(["win", "loss", "draw"]),
        score: z.number().int().optional(),
        position: z.number().int().optional(),
      }),
    )
    .min(1),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  // Autenticación servidor-a-servidor por secreto compartido.
  const secret = process.env.HUB_RESULT_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401, headers: CORS },
    );
  }

  const { code } = await params;
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400, headers: CORS },
    );
  }

  const parsed = esquema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400, headers: CORS },
    );
  }
  const { kind, notes, results, closeRoom } = parsed.data;

  // La sala debe existir y estar abierta.
  const [sala] = await db
    .select({
      id: rooms.id,
      gameId: rooms.gameId,
      status: rooms.status,
      leagueId: rooms.leagueId,
      tournamentId: rooms.tournamentId,
    })
    .from(rooms)
    .where(eq(rooms.code, code.trim().toUpperCase()))
    .limit(1);
  if (!sala) {
    return NextResponse.json(
      { error: "Sala no encontrada" },
      { status: 404, headers: CORS },
    );
  }
  if (sala.status !== "open") {
    return NextResponse.json(
      { error: "La sala ya está cerrada" },
      { status: 409, headers: CORS },
    );
  }

  // Todos los jugadores del resultado deben pertenecer a la sala.
  const jugadoresSala = await db
    .select({ userId: roomPlayers.userId })
    .from(roomPlayers)
    .where(eq(roomPlayers.roomId, sala.id));
  const permitidos = new Set(jugadoresSala.map((j) => j.userId));
  const intrusos = results.filter((r) => !permitidos.has(r.userId));
  if (intrusos.length > 0) {
    return NextResponse.json(
      { error: "Hay resultados de jugadores que no están en la sala" },
      { status: 400, headers: CORS },
    );
  }

  // Escribe la partida y cierra la sala.
  try {
    const [match] = await db
      .insert(matches)
      .values({
        gameId: sala.gameId,
        roomId: sala.id,
        kind,
        notes: notes ?? `Sala ${code.toUpperCase()}`,
      })
      .returning({ id: matches.id });

    await db.insert(matchParticipants).values(
      results.map((r) => ({
        matchId: match.id,
        userId: r.userId,
        result: r.result,
        score: r.score ?? null,
        position: r.position ?? null,
      })),
    );

    // ¿Cerrar la sala con este resultado?
    //  - Si el juego envía closeRoom explícitamente, respetamos su decisión
    //    (true al terminar la serie best-of-N, false en partidas intermedias).
    //  - Si NO envía el flag (juegos viejos), nos quedamos con el
    //    comportamiento histórico: cerrar solo cuando es partido de liga.
    const cerrarSala =
      closeRoom === undefined
        ? sala.leagueId !== null || sala.tournamentId !== null
        : closeRoom;
    if (cerrarSala) {
      await db
        .update(rooms)
        .set({ status: "closed" })
        .where(eq(rooms.id, sala.id));

      // Si es un cruce de torneo, hace avanzar al ganador por el cuadro (y crea
      // la sala de la ronda siguiente cuando ese cruce queda completo).
      if (sala.tournamentId) {
        const ganador = results.find((r) => r.result === "win")?.userId;
        if (ganador) {
          try {
            await avanzarTorneo(sala.id, ganador);
          } catch (e) {
            console.error("avanzarTorneo error:", e);
          }
        }
      }
    }

    return NextResponse.json(
      { ok: true, matchId: match.id },
      { headers: CORS },
    );
  } catch (e) {
    console.error("POST result error:", e);
    return NextResponse.json(
      { error: "No se pudo guardar el resultado" },
      { status: 500, headers: CORS },
    );
  }
}
