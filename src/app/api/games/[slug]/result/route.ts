/**
 * Endpoint gemelo de `/api/rooms/[code]/result` para juegos SIN sala
 * (individuales, p. ej. Marvel Trivia): el backend del juego devuelve el
 * resultado autenticado con el secreto compartido (HUB_RESULT_SECRET), por
 * `slug` de juego en vez de código de sala. Igual que las salas, escribe
 * `matches` (con `room_id: null`) + `match_participants`. Ver
 * INTEGRACION-JUEGOS.md.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, games, matchParticipants, matches } from "@/db";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Cache-Control": "no-store",
};

const esquema = z.object({
  kind: z.enum(["practice", "ranked"]).default("ranked"),
  notes: z.string().trim().max(200).optional(),
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

function autorizado(request: Request): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const secretos = [process.env.HUB_RESULT_SECRET, process.env.HUB_RESULT_SECRET_2];
  return secretos.some((s) => s && auth === `Bearer ${s}`);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: CORS });
  }

  const { slug } = await params;
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: CORS });
  }

  const parsed = esquema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400, headers: CORS },
    );
  }
  const { kind, notes, results } = parsed.data;

  const [juego] = await db
    .select({ id: games.id, active: games.active })
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);
  if (!juego || !juego.active) {
    return NextResponse.json(
      { error: "Juego no encontrado o inactivo" },
      { status: 404, headers: CORS },
    );
  }

  try {
    const [match] = await db
      .insert(matches)
      .values({ gameId: juego.id, roomId: null, kind, notes: notes ?? null })
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

    return NextResponse.json({ ok: true, matchId: match.id }, { headers: CORS });
  } catch (e) {
    console.error("POST /api/games/[slug]/result error:", e);
    return NextResponse.json(
      { error: "No se pudo guardar el resultado" },
      { status: 500, headers: CORS },
    );
  }
}
