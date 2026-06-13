import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  games,
  leaguePlayers,
  leagues,
  matchParticipants,
  matches,
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
  leagueId: string | null;
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
    leagueId: string | null;
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
    leagueId: s.leagueId,
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
  leagueId: rooms.leagueId,
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

/**
 * Salas INDEPENDIENTES (sin liga) abiertas en las que participa el usuario o que
 * ha creado. Las salas de ligas se devuelven aparte en getLeaguesForUser.
 */
export async function getRoomsForUser(userId: string): Promise<Sala[]> {
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
    (s) =>
      s.leagueId === null &&
      (s.createdBy === userId || idsJugador.includes(s.id)),
  );
  return montarSalas(propias);
}

export type FilaClasificacion = {
  userId: string;
  nombre: string;
  pj: number; // partidos jugados
  v: number; // victorias
  e: number; // empates
  d: number; // derrotas
  pts: number; // puntos (V=3, E=1, D=0)
};

export type Liga = {
  id: string;
  name: string;
  rounds: number;
  createdBy: string;
  game: { id: string; slug: string; name: string; url: string; icon: string | null };
  salas: Sala[];
  clasificacion: FilaClasificacion[];
};

/** Ligas en las que participa el usuario o que ha creado, con sus salas (partidos). */
export async function getLeaguesForUser(userId: string): Promise<Liga[]> {
  const comoJugador = await db
    .select({ leagueId: leaguePlayers.leagueId })
    .from(leaguePlayers)
    .where(eq(leaguePlayers.userId, userId));
  const idsJugador = new Set(comoJugador.map((r) => r.leagueId));

  const filasLiga = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      rounds: leagues.rounds,
      createdBy: leagues.createdBy,
      createdAt: leagues.createdAt,
      gameId: games.id,
      slug: games.slug,
      gameName: games.name,
      url: games.url,
      icon: games.icon,
    })
    .from(leagues)
    .innerJoin(games, eq(games.id, leagues.gameId))
    .orderBy(desc(leagues.createdAt));

  const mias = filasLiga.filter(
    (l) => l.createdBy === userId || idsJugador.has(l.id),
  );
  if (mias.length === 0) return [];

  // Todas las salas de esas ligas.
  const ids = mias.map((l) => l.id);
  const filasSalas = await db
    .select(seleccionSala)
    .from(rooms)
    .innerJoin(games, eq(games.id, rooms.gameId))
    .where(inArray(rooms.leagueId, ids))
    .orderBy(desc(rooms.createdAt));
  const salas = await montarSalas(filasSalas);

  const salasPorLiga = new Map<string, Sala[]>();
  for (const s of salas) {
    if (!s.leagueId) continue;
    const arr = salasPorLiga.get(s.leagueId) ?? [];
    arr.push(s);
    salasPorLiga.set(s.leagueId, arr);
  }

  // --- Clasificación: jugadores apuntados + resultados de los partidos jugados ---
  const filasLP = await db
    .select({
      leagueId: leaguePlayers.leagueId,
      userId: leaguePlayers.userId,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
    })
    .from(leaguePlayers)
    .innerJoin(profiles, eq(profiles.id, leaguePlayers.userId))
    .where(inArray(leaguePlayers.leagueId, ids));

  // Resultados de partidos de estas ligas (match → room → league).
  const filasRes = await db
    .select({
      leagueId: rooms.leagueId,
      userId: matchParticipants.userId,
      result: matchParticipants.result,
    })
    .from(matches)
    .innerJoin(rooms, eq(rooms.id, matches.roomId))
    .innerJoin(matchParticipants, eq(matchParticipants.matchId, matches.id))
    .where(inArray(rooms.leagueId, ids));

  const clasifPorLiga = new Map<string, Map<string, FilaClasificacion>>();
  for (const lp of filasLP) {
    const m = clasifPorLiga.get(lp.leagueId) ?? new Map();
    m.set(lp.userId, {
      userId: lp.userId,
      nombre: lp.nickname || lp.displayName,
      pj: 0,
      v: 0,
      e: 0,
      d: 0,
      pts: 0,
    });
    clasifPorLiga.set(lp.leagueId, m);
  }
  for (const r of filasRes) {
    if (!r.leagueId) continue;
    const fila = clasifPorLiga.get(r.leagueId)?.get(r.userId);
    if (!fila) continue;
    fila.pj++;
    if (r.result === "win") {
      fila.v++;
      fila.pts += 3;
    } else if (r.result === "draw") {
      fila.e++;
      fila.pts += 1;
    } else {
      fila.d++;
    }
  }

  function ordenarClasif(map?: Map<string, FilaClasificacion>): FilaClasificacion[] {
    return [...(map?.values() ?? [])].sort(
      (a, b) =>
        b.pts - a.pts ||
        b.v - a.v ||
        b.v - b.d - (a.v - a.d) ||
        a.nombre.localeCompare(b.nombre, "es"),
    );
  }

  return mias.map((l) => ({
    id: l.id,
    name: l.name,
    rounds: l.rounds,
    createdBy: l.createdBy,
    game: { id: l.gameId, slug: l.slug, name: l.gameName, url: l.url, icon: l.icon },
    salas: salasPorLiga.get(l.id) ?? [],
    clasificacion: ordenarClasif(clasifPorLiga.get(l.id)),
  }));
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
