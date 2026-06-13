"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  games,
  leaguePlayers,
  leagues,
  roomPlayers,
  rooms,
} from "@/db";
import { getCurrentUser, requireAdmin } from "@/auth/helpers";
import { tieneAccesoAlJuego } from "@/db/queries/rooms";

export type ResultadoSala = { ok: boolean; mensaje?: string; code?: string };

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) para códigos fáciles de leer.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generarCodigo(longitud = 6): string {
  let c = "";
  for (let i = 0; i < longitud; i++) c += ALFABETO[randomInt(ALFABETO.length)];
  return c;
}

/** Genera N códigos distintos entre sí (la unicidad global la asegura el índice). */
function generarCodigosUnicos(n: number): string[] {
  const set = new Set<string>();
  while (set.size < n) set.add(generarCodigo());
  return [...set];
}

const esquema = z.object({
  gameId: z.string().uuid("Elige un juego"),
  jugadores: z
    .array(z.string().min(1))
    .min(1, "Añade al menos un jugador"),
});

/**
 * Crea una sala para un juego con una lista de jugadores permitidos y devuelve
 * un código. Cualquier usuario con acceso al juego puede crearla.
 */
export async function crearSala(
  _prev: ResultadoSala,
  formData: FormData,
): Promise<ResultadoSala> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, mensaje: "Tu sesión ha caducado. Recarga la página." };
  }

  let jugadoresRaw: unknown = [];
  try {
    jugadoresRaw = JSON.parse(String(formData.get("jugadores") ?? "[]"));
  } catch {
    return { ok: false, mensaje: "Lista de jugadores incorrecta" };
  }

  const parsed = esquema.safeParse({
    gameId: formData.get("gameId"),
    jugadores: jugadoresRaw,
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const { gameId } = parsed.data;
  // Quita duplicados.
  const jugadores = [...new Set(parsed.data.jugadores)];

  // El creador debe tener acceso al juego.
  if (!(await tieneAccesoAlJuego(user.id, gameId))) {
    return { ok: false, mensaje: "No tienes acceso a ese juego." };
  }

  // No superar el máximo de jugadores del juego (si está definido).
  const [juego] = await db
    .select({ maxPlayers: games.maxPlayers })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (juego?.maxPlayers != null && jugadores.length > juego.maxPlayers) {
    return {
      ok: false,
      mensaje: `Este juego admite como máximo ${juego.maxPlayers} jugadores (has elegido ${jugadores.length}).`,
    };
  }

  // Genera un código único (reintenta si colisiona).
  let code = "";
  for (let intento = 0; intento < 6; intento++) {
    code = generarCodigo();
    const choque = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.code, code))
      .limit(1);
    if (choque.length === 0) break;
    code = "";
  }
  if (!code) {
    return { ok: false, mensaje: "No se pudo generar el código, reinténtalo." };
  }

  try {
    const expira = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 h
    const [sala] = await db
      .insert(rooms)
      .values({ code, gameId, createdBy: user.id, expiresAt: expira })
      .returning({ id: rooms.id });

    await db.insert(roomPlayers).values(
      jugadores.map((uid) => ({
        roomId: sala.id,
        userId: uid,
        role: "player" as const,
      })),
    );
  } catch (e) {
    console.error("crearSala error:", e);
    return { ok: false, mensaje: "No se pudo crear la sala." };
  }

  revalidatePath("/salas");
  return { ok: true, code, mensaje: `Sala creada. Código: ${code}` };
}

const esquemaLiga = z.object({
  gameId: z.string().uuid("Elige un juego"),
  nombre: z.string().trim().min(2, "Ponle nombre a la liga").max(60),
  vueltas: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 vuelta")
    .max(4, "Máximo 4 vueltas"),
  victorias: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 victoria")
    .max(9, "Máximo 9 victorias"),
  jugadores: z
    .array(z.string().min(1))
    .min(2, "Una liga necesita al menos 2 jugadores"),
});

/**
 * Crea una liga (todos contra todos, 1v1). Genera una sala por cada partido entre
 * cada pareja de jugadores, repetido `vueltas` veces. Las salas de liga no caducan.
 */
export async function crearLiga(
  _prev: ResultadoSala,
  formData: FormData,
): Promise<ResultadoSala> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, mensaje: "Tu sesión ha caducado. Recarga la página." };
  }

  let jugadoresRaw: unknown = [];
  try {
    jugadoresRaw = JSON.parse(String(formData.get("jugadores") ?? "[]"));
  } catch {
    return { ok: false, mensaje: "Lista de jugadores incorrecta" };
  }

  const parsed = esquemaLiga.safeParse({
    gameId: formData.get("gameId"),
    nombre: formData.get("nombre"),
    vueltas: formData.get("vueltas"),
    victorias: formData.get("victorias"),
    jugadores: jugadoresRaw,
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const { gameId, nombre, vueltas, victorias } = parsed.data;
  const jugadores = [...new Set(parsed.data.jugadores)];
  if (jugadores.length < 2) {
    return { ok: false, mensaje: "Una liga necesita al menos 2 jugadores." };
  }

  if (!(await tieneAccesoAlJuego(user.id, gameId))) {
    return { ok: false, mensaje: "No tienes acceso a ese juego." };
  }
  // Cada partido es 1v1; el juego debe admitir 2 jugadores.
  const [juego] = await db
    .select({ maxPlayers: games.maxPlayers })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (juego?.maxPlayers != null && juego.maxPlayers < 2) {
    return { ok: false, mensaje: "Este juego no admite partidos de 2 jugadores." };
  }

  // Round-robin: todas las parejas (i<j).
  const pares: [string, string][] = [];
  for (let i = 0; i < jugadores.length; i++) {
    for (let j = i + 1; j < jugadores.length; j++) {
      pares.push([jugadores[i], jugadores[j]]);
    }
  }
  // Lista de partidos = parejas repetidas `vueltas` veces.
  const partidos: [string, string][] = [];
  for (let v = 0; v < vueltas; v++) partidos.push(...pares);

  try {
    const [liga] = await db
      .insert(leagues)
      .values({
        name: nombre,
        gameId,
        rounds: vueltas,
        winsNeeded: victorias,
        createdBy: user.id,
      })
      .returning({ id: leagues.id });

    await db
      .insert(leaguePlayers)
      .values(jugadores.map((uid) => ({ leagueId: liga.id, userId: uid })));

    // Una sala por partido (sin caducidad), en lote.
    const codigos = generarCodigosUnicos(partidos.length);
    const salas = await db
      .insert(rooms)
      .values(
        codigos.map((code) => ({
          code,
          gameId,
          createdBy: user.id,
          leagueId: liga.id,
          expiresAt: null,
        })),
      )
      .returning({ id: rooms.id, code: rooms.code });

    const idPorCode = new Map(salas.map((s) => [s.code, s.id]));
    const jugadoresSalas = partidos.flatMap((par, idx) => {
      const roomId = idPorCode.get(codigos[idx])!;
      return [
        { roomId, userId: par[0], role: "player" as const },
        { roomId, userId: par[1], role: "player" as const },
      ];
    });
    await db.insert(roomPlayers).values(jugadoresSalas);

    revalidatePath("/salas");
    return {
      ok: true,
      mensaje: `Liga «${nombre}» creada con ${partidos.length} partido(s).`,
    };
  } catch (e) {
    console.error("crearLiga error:", e);
    return { ok: false, mensaje: "No se pudo crear la liga, inténtalo de nuevo." };
  }
}

/** Cierra una sala (solo el creador). */
export async function cerrarSala(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const roomId = String(formData.get("roomId") ?? "");
  if (!roomId) return;

  await db
    .update(rooms)
    .set({ status: "closed" })
    .where(and(eq(rooms.id, roomId), eq(rooms.createdBy, user.id)));

  revalidatePath("/salas");
}

// --- Acciones de administración ---------------------------------------------

/** Cierra cualquier sala (admin), sea de quien sea. */
export async function cerrarSalaAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const roomId = String(formData.get("roomId") ?? "");
  if (!roomId) return;

  await db.update(rooms).set({ status: "closed" }).where(eq(rooms.id, roomId));

  revalidatePath("/admin/salas");
  revalidatePath("/salas");
  revalidatePath("/ligas");
}

/**
 * Cierra una liga entera (admin): marca como cerradas todas sus salas. La liga y
 * su clasificación se conservan (historial), pero ya no se puede jugar.
 */
export async function cerrarLigaAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const leagueId = String(formData.get("leagueId") ?? "");
  if (!leagueId) return;

  await db
    .update(rooms)
    .set({ status: "closed" })
    .where(eq(rooms.leagueId, leagueId));

  revalidatePath("/admin/salas");
  revalidatePath("/ligas");
}

/**
 * Elimina una liga (admin) y todas sus salas/partidos. Los resultados ya
 * registrados en `matches` quedan con room_id = null (no cuentan en clasificación).
 */
export async function eliminarLigaAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const leagueId = String(formData.get("leagueId") ?? "");
  if (!leagueId) return;

  // El borrado en cascada del esquema elimina league_players, sus rooms y
  // room_players; matches.room_id se pone a null (on delete set null).
  await db.delete(leagues).where(eq(leagues.id, leagueId));

  revalidatePath("/admin/salas");
  revalidatePath("/ligas");
}
