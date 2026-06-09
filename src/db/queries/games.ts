import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, games, userGames, type Game } from "@/db";

/**
 * Juegos a los que un usuario tiene acceso (vía user_games) y que están activos.
 * Es lo que se muestra en el hub.
 */
export async function getGamesForUser(userId: string): Promise<Game[]> {
  const filas = await db
    .select({ game: games })
    .from(userGames)
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(and(eq(userGames.userId, userId), eq(games.active, true)))
    .orderBy(asc(games.name));

  return filas.map((f) => f.game);
}

/** Todos los juegos del catálogo (para el panel de admin). */
export async function getAllGames(): Promise<Game[]> {
  return db.select().from(games).orderBy(asc(games.name));
}
