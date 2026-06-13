/**
 * Esquema de la base de datos (Drizzle ORM) — esquema "public".
 *
 * Las tablas de usuarios/sesiones las gestiona Neon Auth en el esquema
 * "neon_auth" y NO se declaran aquí. La tabla `profiles` enlaza con ese usuario
 * por `id` (el id de usuario de Neon Auth, de tipo text).
 *
 * Las políticas RLS se añaden en un paso posterior (Hito 4) sobre estas mismas
 * tablas usando los helpers de `drizzle-orm/neon`.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authenticatedRole, crudPolicy } from "drizzle-orm/neon";

/**
 * Predicado SQL "el usuario actual es admin". Lo usan las políticas de
 * escritura (solo admin) de games, user_games, matches y match_participants.
 *
 * No provoca recursión: la política de LECTURA de `profiles` permite a cualquier
 * autenticado leer la tabla, así que esta subconsulta encuentra la fila sin
 * disparar de nuevo una comprobación de admin.
 */
const esAdmin = sql`(
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
)`;

// --- Enums -------------------------------------------------------------------

/** Tipo de partida: práctica (no cuenta para ranking) u oficial. */
export const matchKind = pgEnum("match_kind", ["practice", "ranked"]);

/** Resultado de un participante en una partida. */
export const participantResult = pgEnum("participant_result", [
  "win",
  "loss",
  "draw",
]);

/** Estado de una sala: abierta (usable) o cerrada (terminada/cancelada). */
export const roomStatus = pgEnum("room_status", ["open", "closed"]);

/** Rol de un usuario dentro de una sala. */
export const roomPlayerRole = pgEnum("room_player_role", [
  "player",
  "spectator",
]);

// --- Tablas ------------------------------------------------------------------

/**
 * Perfil de cada persona. `id` es el id de usuario de Neon Auth (text).
 * No se declara FK física al esquema neon_auth (lo gestiona Neon Auth); la
 * integridad se mantiene desde la app al invitar / primer login.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    nickname: text("nickname"),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Cualquier autenticado lee todos los perfiles (se muestran en rankings);
    // cada quien solo puede modificar su propia fila. Los admins editan otros
    // perfiles desde el servidor con la conexión privilegiada (salta RLS).
    crudPolicy({
      role: authenticatedRole,
      read: true,
      modify: authUid(t.id),
    }),
  ],
);

/** Catálogo de juegos desplegados (cada uno vive en su propia URL de Vercel). */
export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    icon: text("icon"),
    active: boolean("active").notNull().default(true),
    // Máximo de jugadores que admite el juego. null = sin límite. Se usa para
    // impedir crear salas con más jugadores de los que soporta el juego.
    maxPlayers: integer("max_players"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => [
    // Catálogo visible para todos los autenticados; solo admin puede modificarlo.
    crudPolicy({ role: authenticatedRole, read: true, modify: esAdmin }),
  ],
);

/**
 * Control de permisos: qué persona puede entrar a qué juego.
 * PK compuesta (user_id, game_id).
 */
export const userGames = pgTable(
  "user_games",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.gameId] }),
    // Cada usuario solo ve SUS permisos; solo admin concede/revoca.
    crudPolicy({
      role: authenticatedRole,
      read: authUid(t.userId),
      modify: esAdmin,
    }),
  ],
);

/** Una partida jugada (cabecera). Los resultados van en match_participants. */
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    kind: matchKind("kind").notNull(),
    playedAt: timestamp("played_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text("notes"),
  },
  () => [
    // Historial visible para todos los autenticados (competición familiar);
    // solo admin (o, en el futuro, el servicio del juego) registra partidas.
    crudPolicy({ role: authenticatedRole, read: true, modify: esAdmin }),
  ],
);

/** Resultado de cada participante en una partida. */
export const matchParticipants = pgTable(
  "match_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    result: participantResult("result").notNull(),
    score: integer("score"),
    position: integer("position"),
  },
  () => [
    crudPolicy({ role: authenticatedRole, read: true, modify: esAdmin }),
  ],
);

/**
 * Liga (todos contra todos). Al crearla se genera una sala por cada partido entre
 * parejas de jugadores apuntados, repetido `rounds` veces (vueltas).
 */
export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  rounds: integer("rounds").notNull().default(1),
  createdBy: text("created_by")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Jugadores apuntados a una liga. */
export const leaguePlayers = pgTable(
  "league_players",
  {
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.leagueId, t.userId] })],
);

/**
 * Sala (lobby) creada en el hub antes de ir al juego. Tiene un código corto que
 * se introduce en el juego externo; este consulta la sala vía /api/rooms/{code}.
 * Si pertenece a una liga, `leagueId` la enlaza (y entonces no caduca).
 */
export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  leagueId: uuid("league_id").references(() => leagues.id, {
    onDelete: "cascade",
  }),
  status: roomStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

/** Usuarios permitidos en una sala (jugadores; en el futuro, espectadores). */
export const roomPlayers = pgTable(
  "room_players",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: roomPlayerRole("role").notNull().default("player"),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] })],
);

// --- Tipos inferidos (para usar en la app) -----------------------------------

export type MatchKind = (typeof matchKind.enumValues)[number];
export type ParticipantResult = (typeof participantResult.enumValues)[number];

export type Profile = typeof profiles.$inferSelect;
export type Game = typeof games.$inferSelect;
export type UserGame = typeof userGames.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type MatchParticipant = typeof matchParticipants.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type RoomPlayer = typeof roomPlayers.$inferSelect;
export type League = typeof leagues.$inferSelect;
export type LeaguePlayer = typeof leaguePlayers.$inferSelect;
export type RoomStatus = (typeof roomStatus.enumValues)[number];
