import "server-only";
import { randomInt } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  games,
  profiles,
  roomPlayers,
  rooms,
  tournamentMatches,
  tournamentPlayers,
  tournaments,
  type RoomStatus,
} from "@/db";

// --- Helpers del cuadro (puros) ---------------------------------------------

/** Tamaño del cuadro: menor potencia de 2 ≥ n (mínimo 4). */
export function tamanoCuadro(n: number): number {
  let b = 4;
  while (b < n) b *= 2;
  return b;
}

/** Nº de rondas de un cuadro de tamaño B (B=4→2, 8→3, 16→4…). */
export function numRondas(bracketSize: number): number {
  return Math.round(Math.log2(bracketSize));
}

/** Nombre de la ronda según cuántos jugadores entran en ella. */
export function nombreRonda(jugadoresEnRonda: number): string {
  switch (jugadoresEnRonda) {
    case 2:
      return "Final";
    case 4:
      return "Semifinales";
    case 8:
      return "Cuartos de final";
    case 16:
      return "Octavos de final";
    case 32:
      return "Dieciseisavos de final";
    default:
      return `Ronda de ${jugadoresEnRonda}`;
  }
}

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generarCodigo(longitud = 6): string {
  let c = "";
  for (let i = 0; i < longitud; i++) c += ALFABETO[randomInt(ALFABETO.length)];
  return c;
}

/** Genera un código de sala único (reintenta si choca con el índice). */
export async function generarCodigoSalaUnico(): Promise<string> {
  for (let intento = 0; intento < 8; intento++) {
    const code = generarCodigo();
    const choque = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.code, code))
      .limit(1);
    if (choque.length === 0) return code;
  }
  throw new Error("No se pudo generar un código de sala único");
}

/** Crea la sala (room) de un cruce con sus dos jugadores. Devuelve su id. */
export async function crearSalaCruce(opts: {
  tournamentId: string;
  gameId: string;
  winsNeeded: number;
  createdBy: string;
  player1: string;
  player2: string;
}): Promise<string> {
  const code = await generarCodigoSalaUnico();
  const [sala] = await db
    .insert(rooms)
    .values({
      code,
      gameId: opts.gameId,
      createdBy: opts.createdBy,
      tournamentId: opts.tournamentId,
      winsNeeded: opts.winsNeeded,
      expiresAt: null,
    })
    .returning({ id: rooms.id });
  await db.insert(roomPlayers).values([
    { roomId: sala.id, userId: opts.player1, role: "player" as const },
    { roomId: sala.id, userId: opts.player2, role: "player" as const },
  ]);
  return sala.id;
}

/**
 * Avanza el cuadro tras conocerse el ganador de la sala de un cruce. Coloca al
 * ganador en el cruce de la ronda siguiente y, si ese cruce queda con sus dos
 * jugadores, le crea su sala. Si era la final, fija el campeón. Idempotente: si
 * el cruce ya tenía ganador, no hace nada.
 */
export async function avanzarTorneo(
  roomId: string,
  winnerId: string,
): Promise<void> {
  const [cruce] = await db
    .select()
    .from(tournamentMatches)
    .where(eq(tournamentMatches.roomId, roomId))
    .limit(1);
  if (!cruce || cruce.winnerId) return; // no es de torneo, o ya resuelto

  await db
    .update(tournamentMatches)
    .set({ winnerId })
    .where(eq(tournamentMatches.id, cruce.id));

  const [torneo] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, cruce.tournamentId))
    .limit(1);
  if (!torneo) return;

  const rondas = numRondas(torneo.bracketSize);
  const sigRonda = cruce.round + 1;

  // Era la final: tenemos campeón.
  if (sigRonda >= rondas) {
    await db
      .update(tournaments)
      .set({ championId: winnerId, status: "closed" })
      .where(eq(tournaments.id, torneo.id));
    return;
  }

  // Coloca al ganador en el cruce siguiente (player1 si venía de slot par).
  const sigSlot = Math.floor(cruce.slot / 2);
  const cond = and(
    eq(tournamentMatches.tournamentId, torneo.id),
    eq(tournamentMatches.round, sigRonda),
    eq(tournamentMatches.slot, sigSlot),
  );
  if (cruce.slot % 2 === 0) {
    await db.update(tournamentMatches).set({ player1Id: winnerId }).where(cond);
  } else {
    await db.update(tournamentMatches).set({ player2Id: winnerId }).where(cond);
  }

  // Si el cruce siguiente ya tiene a sus dos jugadores, créale la sala.
  const [sig] = await db
    .select()
    .from(tournamentMatches)
    .where(cond)
    .limit(1);
  if (sig && sig.player1Id && sig.player2Id && !sig.roomId) {
    const salaId = await crearSalaCruce({
      tournamentId: torneo.id,
      gameId: torneo.gameId,
      winsNeeded: torneo.winsNeeded,
      createdBy: torneo.createdBy,
      player1: sig.player1Id,
      player2: sig.player2Id,
    });
    await db
      .update(tournamentMatches)
      .set({ roomId: salaId })
      .where(eq(tournamentMatches.id, sig.id));
  }
}

// --- Lectura para la página de torneos --------------------------------------

export type CruceTorneo = {
  round: number;
  slot: number;
  p1: { userId: string; nombre: string } | null;
  p2: { userId: string; nombre: string } | null;
  winnerId: string | null;
  code: string | null;
  status: RoomStatus | null; // estado de la sala del cruce (si existe)
  esBye: boolean; // un jugador pasó automáticamente (sin rival)
};

export type RondaTorneo = {
  round: number;
  nombre: string;
  cruces: CruceTorneo[];
};

export type Torneo = {
  id: string;
  name: string;
  winsNeeded: number;
  bracketSize: number;
  status: RoomStatus;
  createdBy: string;
  game: { id: string; slug: string; name: string; url: string; icon: string | null };
  champion: { userId: string; nombre: string } | null;
  jugadores: { userId: string; nombre: string }[];
  rondas: RondaTorneo[];
};

/** Torneos en los que participa el usuario o que ha creado, con su cuadro. */
export async function getTournamentsForUser(userId: string): Promise<Torneo[]> {
  const comoJugador = await db
    .select({ tournamentId: tournamentPlayers.tournamentId })
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.userId, userId));
  const idsJugador = new Set(comoJugador.map((r) => r.tournamentId));

  const filasTorneo = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      winsNeeded: tournaments.winsNeeded,
      bracketSize: tournaments.bracketSize,
      status: tournaments.status,
      championId: tournaments.championId,
      createdBy: tournaments.createdBy,
      createdAt: tournaments.createdAt,
      gameId: games.id,
      slug: games.slug,
      gameName: games.name,
      url: games.url,
      icon: games.icon,
    })
    .from(tournaments)
    .innerJoin(games, eq(games.id, tournaments.gameId))
    .orderBy(desc(tournaments.createdAt));

  const mios = filasTorneo.filter(
    (t) => t.createdBy === userId || idsJugador.has(t.id),
  );
  if (mios.length === 0) return [];
  const ids = mios.map((t) => t.id);

  // Jugadores (nombre por perfil) y mapa userId→nombre por torneo.
  const filasJug = await db
    .select({
      tournamentId: tournamentPlayers.tournamentId,
      userId: tournamentPlayers.userId,
      seed: tournamentPlayers.seed,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
    })
    .from(tournamentPlayers)
    .innerJoin(profiles, eq(profiles.id, tournamentPlayers.userId))
    .where(inArray(tournamentPlayers.tournamentId, ids));

  const nombrePorTorneoUsuario = new Map<string, Map<string, string>>();
  const jugadoresPorTorneo = new Map<string, { userId: string; nombre: string; seed: number }[]>();
  for (const j of filasJug) {
    const nombre = j.nickname || j.displayName;
    if (!nombrePorTorneoUsuario.has(j.tournamentId))
      nombrePorTorneoUsuario.set(j.tournamentId, new Map());
    nombrePorTorneoUsuario.get(j.tournamentId)!.set(j.userId, nombre);
    const arr = jugadoresPorTorneo.get(j.tournamentId) ?? [];
    arr.push({ userId: j.userId, nombre, seed: j.seed });
    jugadoresPorTorneo.set(j.tournamentId, arr);
  }

  // Cruces + estado de su sala.
  const filasCruce = await db
    .select({
      tournamentId: tournamentMatches.tournamentId,
      round: tournamentMatches.round,
      slot: tournamentMatches.slot,
      player1Id: tournamentMatches.player1Id,
      player2Id: tournamentMatches.player2Id,
      winnerId: tournamentMatches.winnerId,
      code: rooms.code,
      roomStatus: rooms.status,
    })
    .from(tournamentMatches)
    .leftJoin(rooms, eq(rooms.id, tournamentMatches.roomId))
    .where(inArray(tournamentMatches.tournamentId, ids));

  const crucesPorTorneo = new Map<string, typeof filasCruce>();
  for (const c of filasCruce) {
    const arr = crucesPorTorneo.get(c.tournamentId) ?? [];
    arr.push(c);
    crucesPorTorneo.set(c.tournamentId, arr);
  }

  return mios.map((t) => {
    const nombres = nombrePorTorneoUsuario.get(t.id) ?? new Map<string, string>();
    const nombreDe = (uid: string | null) =>
      uid ? { userId: uid, nombre: nombres.get(uid) ?? "¿?" } : null;

    const rondasN = numRondas(t.bracketSize);
    const cruces = crucesPorTorneo.get(t.id) ?? [];
    const rondas: RondaTorneo[] = [];
    for (let r = 0; r < rondasN; r++) {
      const jugadoresEnRonda = t.bracketSize / 2 ** r;
      const deRonda = cruces
        .filter((c) => c.round === r)
        .sort((a, b) => a.slot - b.slot)
        .map((c): CruceTorneo => {
          const p1 = nombreDe(c.player1Id);
          const p2 = nombreDe(c.player2Id);
          // En la primera ronda, un cruce con un solo jugador es un "bye".
          const esBye = r === 0 && !!p1 && !p2;
          return {
            round: c.round,
            slot: c.slot,
            p1,
            p2,
            winnerId: c.winnerId,
            code: c.code,
            status: c.roomStatus,
            esBye,
          };
        });
      rondas.push({ round: r, nombre: nombreRonda(jugadoresEnRonda), cruces: deRonda });
    }

    return {
      id: t.id,
      name: t.name,
      winsNeeded: t.winsNeeded,
      bracketSize: t.bracketSize,
      status: t.status,
      createdBy: t.createdBy,
      game: { id: t.gameId, slug: t.slug, name: t.gameName, url: t.url, icon: t.icon },
      champion: nombreDe(t.championId),
      jugadores: (jugadoresPorTorneo.get(t.id) ?? [])
        .sort((a, b) => a.seed - b.seed)
        .map((j) => ({ userId: j.userId, nombre: j.nombre })),
      rondas,
    };
  });
}

export type TorneoAdmin = {
  id: string;
  name: string;
  gameName: string;
  gameIcon: string | null;
  status: RoomStatus;
  campeon: string | null;
  createdAt: Date;
};

/** Todos los torneos (panel admin). */
export async function getAllTournamentsAdmin(): Promise<TorneoAdmin[]> {
  const filas = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      status: tournaments.status,
      championId: tournaments.championId,
      createdAt: tournaments.createdAt,
      gameName: games.name,
      gameIcon: games.icon,
    })
    .from(tournaments)
    .innerJoin(games, eq(games.id, tournaments.gameId))
    .orderBy(desc(tournaments.createdAt));
  if (filas.length === 0) return [];

  const nombres = new Map<string, string>();
  const champIds = filas.map((f) => f.championId).filter((x): x is string => !!x);
  if (champIds.length > 0) {
    const ps = await db
      .select({ id: profiles.id, displayName: profiles.displayName, nickname: profiles.nickname })
      .from(profiles)
      .where(inArray(profiles.id, champIds));
    for (const p of ps) nombres.set(p.id, p.nickname || p.displayName);
  }

  return filas.map((f) => ({
    id: f.id,
    name: f.name,
    gameName: f.gameName,
    gameIcon: f.gameIcon,
    status: f.status,
    campeon: f.championId ? nombres.get(f.championId) ?? null : null,
    createdAt: f.createdAt,
  }));
}
