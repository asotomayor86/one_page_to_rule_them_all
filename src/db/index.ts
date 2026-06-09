/**
 * Cliente Drizzle privilegiado (rol owner) sobre DATABASE_URL.
 *
 * Este cliente NO pasa por RLS: lo usan las Server Actions del servidor que ya
 * han comprobado los permisos en código (p. ej. el panel de admin). El camino
 * con RLS para juegos externos va por la Data API de Neon (ver INTEGRACION-JUEGOS.md).
 *
 * La conexión se crea de forma PEREZOSA (en la primera consulta) mediante un
 * Proxy: así el build de Next no falla aunque DATABASE_URL no esté definida
 * todavía. El error solo salta en tiempo de ejecución si de verdad falta.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

let instancia: DB | null = null;

function getDb(): DB {
  if (instancia) return instancia;
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta la variable de entorno DATABASE_URL");
  }
  instancia = drizzle(neon(process.env.DATABASE_URL), { schema });
  return instancia;
}

/**
 * `db` es un Proxy: en el primer acceso a un método (db.select, db.insert, …)
 * crea la conexión real. Todas las consultas ocurren dentro de funciones (en
 * tiempo de petición), nunca al cargar el módulo, así que el build no conecta.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = getDb();
    const valor = Reflect.get(real as object, prop, receiver);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});

export * from "./schema";
