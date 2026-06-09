/**
 * Cliente Drizzle privilegiado (rol owner) sobre DATABASE_URL.
 *
 * Este cliente NO pasa por RLS: lo usan las Server Actions del servidor que ya
 * han comprobado los permisos en código (p. ej. el panel de admin). El camino
 * con RLS para juegos externos va por la Data API de Neon (ver INTEGRACION-JUEGOS.md).
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export * from "./schema";
