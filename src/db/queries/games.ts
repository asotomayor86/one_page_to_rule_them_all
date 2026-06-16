import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, games, type Game } from "@/db";

/**
 * Juegos visibles para un usuario en el hub: TODOS los que están activos. Un
 * juego activo ("visible") es accesible para cualquier usuario autenticado, sin
 * necesidad de un permiso por usuario. Se mantiene el parámetro por compatibilidad
 * con las llamadas existentes (hub, salas, ligas).
 */
export async function getGamesForUser(_userId: string): Promise<Game[]> {
  return db
    .select()
    .from(games)
    .where(eq(games.active, true))
    .orderBy(asc(games.name));
}

/** Todos los juegos del catálogo (para el panel de admin). */
export async function getAllGames(): Promise<Game[]> {
  return db.select().from(games).orderBy(asc(games.name));
}
