"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, games, roomPlayers, rooms } from "@/db";
import { getCurrentUser } from "@/auth/helpers";
import { tieneAccesoAlJuego } from "@/db/queries/rooms";

export type ResultadoSala = { ok: boolean; mensaje?: string; code?: string };

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) para códigos fáciles de leer.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generarCodigo(longitud = 6): string {
  let c = "";
  for (let i = 0; i < longitud; i++) c += ALFABETO[randomInt(ALFABETO.length)];
  return c;
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
