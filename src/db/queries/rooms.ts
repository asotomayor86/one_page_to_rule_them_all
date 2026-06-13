import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  games,
  profiles,
  roomPlayers,
  rooms,
  userGames,
  type RoomStatus,
} from "@/db";

export type SalaJugador = {
  userId: string;
  nombre: string;
  role: "player" | "spectator";
};

export type Sala = {
  id: string;
  code: string;
  status: RoomStatus;
  createdAt: Date;
  expiresAt: Date | null;
  createdBy: string;
  game: { id: string; slug: string; name: string; url: string; icon: string | null };
  jugadores: SalaJugador[];
};

/** Carga una sala (con juego y jugadores) a partir de varias filas planas. */
async function montarSalas(
  filasSala: {
    id: string;
    code: string;
    status: RoomStatus;
    createdAt: Date;
    expiresAt: Date | null;
    createdBy: string;
    gameId: string;
    slug: string;
    name: string;
    url: string;
    icon: string | null;
  }[],
): Promise<Sala[]> {
  if (filasSala.length === 0) return [];

  const ids = filasSala.map((s) => s.id);
  const jugadores = await db
    .select({
      roomId: roomPlayers.roomId,
      userId: roomPlayers.userId,
      role: roomPlayers.role,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
    })
    .from(roomPlayers)
    .innerJoin(profiles, eq(profiles.id, roomPlayers.userId))
    .where(inArray(roomPlayers.roomId, ids));

  const porSala = new Map<string, SalaJugador[]>();
  for (const j of jugadores) {
    const arr = porSala.get(j.roomId) ?? [];
    arr.push({
      userId: j.userId,
      nombre: j.nickname || j.displayName,
      role: j.role,
    });
    porSala.set(j.roomId, arr);
  }

  return filasSala.map((s) => ({
    id: s.id,
    code: s.code,
    status: s.status,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    createdBy: s.createdBy,
    game: {
      id: s.gameId,
      slug: s.slug,
      name: s.name,
      url: s.url,
      icon: s.icon,
    },
    jugadores: porSala.get(s.id) ?? [],
  }));
}

const seleccionSala = {
  id: rooms.id,
  code: rooms.code,
  status: rooms.status,
  createdAt: rooms.createdAt,
  expiresAt: rooms.expiresAt,
  createdBy: rooms.createdBy,
  gameId: games.id,
  slug: games.slug,
  name: games.name,
  url: games.url,
  icon: games.icon,
};

/** Una sala por su código (para el endpoint que consultan los juegos). */
export async function getRoomByCode(code: string): Promise<Sala | null> {
  const filas = await db
    .select(seleccionSala)
    .from(rooms)
    .innerJoin(games, eq(games.id, rooms.gameId))
    .where(eq(rooms.code, code))
    .limit(1);
  const salas = await montarSalas(filas);
  return salas[0] ?? null;
}

/** Salas abiertas en las que participa el usuario o que ha creado. */
export async function getRoomsForUser(userId: string): Promise<Sala[]> {
  // Salas donde es jugador.
  const comoJugador = await db
    .select({ roomId: roomPlayers.roomId })
    .from(roomPlayers)
    .where(eq(roomPlayers.userId, userId));
  const idsJugador = comoJugador.map((r) => r.roomId);

  const filas = await db
    .select(seleccionSala)
    .from(rooms)
    .innerJoin(games, eq(games.id, rooms.gameId))
    .where(eq(rooms.status, "open"))
    .orderBy(desc(rooms.createdAt));

  const propias = filas.filter(
    (s) => s.createdBy === userId || idsJugador.includes(s.id),
  );
  return montarSalas(propias);
}

/** ¿Tiene el usuario acceso (user_games) a ese juego? */
export async function tieneAccesoAlJuego(
  userId: string,
  gameId: string,
): Promise<boolean> {
  const filas = await db
    .select({ gameId: userGames.gameId })
    .from(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)))
    .limit(1);
  return filas.length > 0;
}
