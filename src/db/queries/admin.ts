import "server-only";
import { asc } from "drizzle-orm";
import { getAuth } from "@/auth/server";
import { db, profiles, userGames } from "@/db";

export type UsuarioAdmin = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  nickname: string | null;
  gameIds: string[];
};

/**
 * Lista de usuarios para el panel: combina los usuarios de Neon Auth (para el
 * email) con nuestra tabla `profiles` (nombre, apodo, admin) y sus permisos.
 */
export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const { data } = await getAuth().admin.listUsers({ query: { limit: 500 } });
  const authUsers = (data?.users ?? []) as Array<{
    id: string;
    email: string;
    name?: string | null;
  }>;

  const perfiles = await db.select().from(profiles);
  const permisos = await db.select().from(userGames);

  const perfilPorId = new Map(perfiles.map((p) => [p.id, p]));
  const juegosPorUsuario = new Map<string, string[]>();
  for (const up of permisos) {
    const arr = juegosPorUsuario.get(up.userId) ?? [];
    arr.push(up.gameId);
    juegosPorUsuario.set(up.userId, arr);
  }

  return authUsers
    .map((u) => {
      const p = perfilPorId.get(u.id);
      return {
        id: u.id,
        email: u.email,
        name: p?.displayName ?? u.name ?? u.email,
        isAdmin: p?.isAdmin ?? false,
        nickname: p?.nickname ?? null,
        gameIds: juegosPorUsuario.get(u.id) ?? [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Perfiles simples (id + nombre) para selectores, p. ej. registrar partida. */
export async function listarPerfiles() {
  return db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      nickname: profiles.nickname,
    })
    .from(profiles)
    .orderBy(asc(profiles.displayName));
}
