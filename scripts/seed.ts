/**
 * Seed / bootstrap del hub.
 *
 *  1. Marca como administrador la(s) cuenta(s) indicada(s) en ADMIN_EMAILS:
 *     - pone `profiles.is_admin = true` (autorización de la app), y
 *     - intenta fijar el rol `admin` en Neon Auth (necesario para invitar a
 *       otros con el Admin plugin). Si no puede, te avisa para hacerlo en la
 *       Consola de Neon.
 *  2. Crea un par de juegos de ejemplo si el catálogo está vacío.
 *
 * Requisitos: la persona ya debe haber iniciado sesión al menos una vez (para
 * que exista su usuario en Neon Auth). Ejecuta:  npm run seed
 */
import { sql } from "drizzle-orm";
import { db, games, profiles } from "../src/db";

type FilaUser = { id: string; name: string | null };

function filasDe(res: unknown): FilaUser[] {
  // El driver neon-http puede devolver { rows } o el array directamente.
  const r = res as { rows?: FilaUser[] } | FilaUser[];
  if (Array.isArray(r)) return r;
  return r.rows ?? [];
}

async function main() {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    console.warn("⚠ No hay ADMIN_EMAILS definidos en el entorno.");
  }

  for (const email of emails) {
    let userId: string | null = null;
    let nombre = email.split("@")[0];

    try {
      const res = await db.execute(
        sql`select id, name from neon_auth."user" where lower(email) = ${email} limit 1`,
      );
      const row = filasDe(res)[0];
      if (row) {
        userId = row.id;
        nombre = row.name ?? nombre;
      }
    } catch (e) {
      console.warn(
        `No pude leer neon_auth.user (¿está habilitado Neon Auth?): ${(e as Error).message}`,
      );
    }

    if (!userId) {
      console.warn(
        `⚠ ${email}: todavía no tiene cuenta en Neon Auth. Que inicie sesión una vez (o invítalo desde otro admin) y vuelve a ejecutar "npm run seed".`,
      );
      continue;
    }

    // Rol admin en Neon Auth (mejor esfuerzo: la columna role puede variar).
    try {
      await db.execute(
        sql`update neon_auth."user" set role = 'admin' where id = ${userId}`,
      );
    } catch (e) {
      console.warn(
        `No pude fijar el rol admin en Neon Auth para ${email}. Hazlo en la Consola de Neon (Auth → usuarios → rol "admin"). Detalle: ${(e as Error).message}`,
      );
    }

    // Flag de admin de la app.
    await db
      .insert(profiles)
      .values({ id: userId, displayName: nombre, isAdmin: true })
      .onConflictDoUpdate({ target: profiles.id, set: { isAdmin: true } });

    console.log(`✓ ${email} es administrador.`);
  }

  // Juegos de ejemplo si el catálogo está vacío (edítalos luego en /admin/juegos).
  const hayJuegos = await db.select({ id: games.id }).from(games).limit(1);
  if (hayJuegos.length === 0) {
    await db.insert(games).values([
      {
        slug: "parchis",
        name: "Parchís",
        description: "El clásico de comerse las fichas.",
        url: "https://example.com",
        icon: "🎲",
        active: true,
      },
      {
        slug: "ajedrez",
        name: "Ajedrez",
        description: "Jaque mate familiar.",
        url: "https://example.com",
        icon: "♟️",
        active: true,
      },
    ]);
    console.log(
      "✓ Juegos de ejemplo creados (cambia sus URLs reales en /admin/juegos).",
    );
  }

  console.log("Seed completado.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error en el seed:", e);
  process.exit(1);
});
