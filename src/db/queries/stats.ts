import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  games,
  matchParticipants,
  matches,
  profiles,
  type MatchKind,
} from "@/db";

export type FilaRanking = {
  userId: string;
  nombre: string;
  jugadas: number;
  victorias: number;
  derrotas: number;
  empates: number;
  porcentajeVictoria: number; // 0..100
  // Suma de `score` (p. ej. aciertos de trivia) — juegos sin puntuación
  // numérica (la mayoría, por turnos) se quedan a 0. Pensado para juegos
  // individuales tipo Marvel Trivia, donde lo relevante es sumar puntos, no
  // victorias/derrotas.
  puntos: number;
};

/**
 * Ranking de jugadores. Si se pasa `gameId`, es el ranking de ese juego; si no,
 * es el global (todos los juegos). Por defecto cuenta solo partidas `ranked`.
 */
export async function ranking(
  gameId?: string,
  kind: MatchKind = "ranked",
): Promise<FilaRanking[]> {
  const filas = await db
    .select({
      userId: profiles.id,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
      jugadas: sql<number>`count(*)`,
      victorias: sql<number>`count(*) filter (where ${matchParticipants.result} = 'win')`,
      derrotas: sql<number>`count(*) filter (where ${matchParticipants.result} = 'loss')`,
      empates: sql<number>`count(*) filter (where ${matchParticipants.result} = 'draw')`,
      puntos: sql<number>`coalesce(sum(${matchParticipants.score}), 0)`,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.id, matchParticipants.matchId))
    .innerJoin(profiles, eq(profiles.id, matchParticipants.userId))
    .where(
      gameId
        ? and(eq(matches.kind, kind), eq(matches.gameId, gameId))
        : eq(matches.kind, kind),
    )
    .groupBy(profiles.id, profiles.displayName, profiles.nickname);

  return filas
    .map((f) => {
      const jugadas = Number(f.jugadas);
      const victorias = Number(f.victorias);
      return {
        userId: f.userId,
        nombre: f.nickname || f.displayName,
        jugadas,
        victorias,
        derrotas: Number(f.derrotas),
        empates: Number(f.empates),
        porcentajeVictoria:
          jugadas > 0 ? Math.round((victorias / jugadas) * 100) : 0,
        puntos: Number(f.puntos),
      };
    })
    .sort(
      (a, b) =>
        b.victorias - a.victorias ||
        b.porcentajeVictoria - a.porcentajeVictoria ||
        b.jugadas - a.jugadas,
    );
}

export type ResultadoH2H = {
  jugadas: number;
  victoriasA: number;
  victoriasB: number;
  empates: number;
};

/**
 * Enfrentamiento directo entre dos jugadores en un juego (partidas `ranked` en
 * las que ambos participaron). En cada partida: gana A si A ganó y B no; gana B
 * en el caso simétrico; el resto cuenta como empate entre ellos.
 */
export async function headToHead(
  gameId: string,
  userA: string,
  userB: string,
  kind: MatchKind = "ranked",
): Promise<ResultadoH2H> {
  const filas = await db
    .select({
      matchId: matchParticipants.matchId,
      userId: matchParticipants.userId,
      result: matchParticipants.result,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.id, matchParticipants.matchId))
    .where(
      and(
        eq(matches.kind, kind),
        eq(matches.gameId, gameId),
        inArray(matchParticipants.userId, [userA, userB]),
      ),
    );

  // Agrupa por partida y compara resultados de A y B.
  const porPartida = new Map<string, { a?: string; b?: string }>();
  for (const f of filas) {
    const entrada = porPartida.get(f.matchId) ?? {};
    if (f.userId === userA) entrada.a = f.result;
    if (f.userId === userB) entrada.b = f.result;
    porPartida.set(f.matchId, entrada);
  }

  const res: ResultadoH2H = {
    jugadas: 0,
    victoriasA: 0,
    victoriasB: 0,
    empates: 0,
  };
  for (const { a, b } of porPartida.values()) {
    if (!a || !b) continue; // ambos deben haber jugado
    res.jugadas++;
    if (a === "win" && b !== "win") res.victoriasA++;
    else if (b === "win" && a !== "win") res.victoriasB++;
    else res.empates++;
  }
  return res;
}

export type PartidaHistorial = {
  id: string;
  gameName: string;
  gameIcon: string | null;
  kind: MatchKind;
  playedAt: Date;
  participantes: {
    nombre: string;
    result: "win" | "loss" | "draw";
    score: number | null;
  }[];
};

/** Últimas partidas registradas, con sus participantes. */
export async function historial(limite = 20): Promise<PartidaHistorial[]> {
  const cabeceras = await db
    .select({
      id: matches.id,
      kind: matches.kind,
      playedAt: matches.playedAt,
      gameName: games.name,
      gameIcon: games.icon,
    })
    .from(matches)
    .innerJoin(games, eq(games.id, matches.gameId))
    .orderBy(desc(matches.playedAt))
    .limit(limite);

  if (cabeceras.length === 0) return [];

  const ids = cabeceras.map((c) => c.id);
  const parts = await db
    .select({
      matchId: matchParticipants.matchId,
      result: matchParticipants.result,
      score: matchParticipants.score,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
    })
    .from(matchParticipants)
    .innerJoin(profiles, eq(profiles.id, matchParticipants.userId))
    .where(inArray(matchParticipants.matchId, ids));

  const porPartida = new Map<string, PartidaHistorial["participantes"]>();
  for (const p of parts) {
    const arr = porPartida.get(p.matchId) ?? [];
    arr.push({
      nombre: p.nickname || p.displayName,
      result: p.result,
      score: p.score,
    });
    porPartida.set(p.matchId, arr);
  }

  return cabeceras.map((c) => ({
    id: c.id,
    gameName: c.gameName,
    gameIcon: c.gameIcon,
    kind: c.kind,
    playedAt: c.playedAt,
    participantes: porPartida.get(c.id) ?? [],
  }));
}

/** Juegos que ya tienen al menos una partida registrada (para filtros). */
export async function juegosConPartidas() {
  const filas = await db
    .selectDistinct({ id: games.id, name: games.name, icon: games.icon })
    .from(matches)
    .innerJoin(games, eq(games.id, matches.gameId));
  return filas;
}
