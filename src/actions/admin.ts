"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/auth/server";
import { requireAdmin } from "@/auth/helpers";
import {
  db,
  games,
  matchParticipants,
  matches,
  profiles,
  userGames,
} from "@/db";

export type ResultadoAccion = { ok: boolean; mensaje?: string };

/** Genera una contraseña temporal robusta (el invitado la cambiará por email). */
function passwordTemporal(): string {
  return randomBytes(18).toString("base64url");
}

// --- Invitar usuario ---------------------------------------------------------

const esquemaInvitar = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  displayName: z.string().trim().min(2, "El nombre es obligatorio").max(40),
  nickname: z
    .string()
    .trim()
    .max(24)
    .optional()
    .transform((v) => (v ? v : null)),
});

/**
 * Crea la cuenta del invitado vía el Admin plugin de Neon Auth y su fila en
 * `profiles`. El invitado establecerá su contraseña con "He olvidado mi
 * contraseña" (Neon Auth le enviará el email).
 */
export async function invitarUsuario(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requireAdmin();

  const parsed = esquemaInvitar.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    nickname: formData.get("nickname"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const { email, displayName, nickname } = parsed.data;

  const { data, error } = await getAuth().admin.createUser({
    email,
    name: displayName,
    password: passwordTemporal(),
    role: "user",
  });

  if (error || !data?.user?.id) {
    return {
      ok: false,
      mensaje: error?.message ?? "No se pudo crear la cuenta",
    };
  }

  // Crea/asegura el perfil con nombre y apodo.
  await db
    .insert(profiles)
    .values({ id: data.user.id, displayName, nickname })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { displayName, nickname },
    });

  revalidatePath("/admin/usuarios");
  return {
    ok: true,
    mensaje: `Invitado ${displayName}. Dile que entre y use «He olvidado mi contraseña» con ${email} para crear su contraseña.`,
  };
}

// --- Marcar / desmarcar administrador ---------------------------------------

/**
 * Cambia el rol admin de un usuario. Mantiene en sincronía nuestra columna
 * `profiles.is_admin` (autorización de la app) y el rol de Better Auth
 * (necesario para usar el Admin plugin).
 */
export async function alternarAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const hacerAdmin = formData.get("hacerAdmin") === "true";
  if (!userId) return;

  await db
    .update(profiles)
    .set({ isAdmin: hacerAdmin })
    .where(eq(profiles.id, userId));

  // Sincroniza el rol en Neon Auth (no rompemos si falla).
  try {
    await getAuth().admin.setRole({ userId, role: hacerAdmin ? "admin" : "user" });
  } catch {
    // El rol de la app (profiles.is_admin) ya quedó actualizado.
  }

  revalidatePath("/admin/usuarios");
}

// --- Conceder / revocar acceso a un juego -----------------------------------

export async function alternarPermiso(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  const conceder = formData.get("conceder") === "true";
  if (!userId || !gameId) return;

  if (conceder) {
    await db
      .insert(userGames)
      .values({ userId, gameId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(userGames)
      .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)));
  }

  revalidatePath("/admin/usuarios");
}

// --- Crear / editar juego ----------------------------------------------------

const esquemaJuego = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "El slug es obligatorio")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  name: z.string().trim().min(2, "El nombre es obligatorio").max(60),
  description: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
  url: z.string().trim().url("La URL no es válida"),
  icon: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => (v ? v : null)),
  active: z.coerce.boolean(),
});

/** Crea un juego nuevo o actualiza uno existente (si llega `id`). */
export async function guardarJuego(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requireAdmin();

  const parsed = esquemaJuego.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description"),
    url: formData.get("url"),
    icon: formData.get("icon"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const { id, ...valores } = parsed.data;

  try {
    if (id) {
      await db.update(games).set(valores).where(eq(games.id, id));
    } else {
      await db.insert(games).values(valores);
    }
  } catch (e) {
    return {
      ok: false,
      mensaje:
        e instanceof Error && e.message.includes("unique")
          ? "Ya existe un juego con ese slug"
          : "No se pudo guardar el juego",
    };
  }

  revalidatePath("/admin/juegos");
  revalidatePath("/hub");
  return { ok: true, mensaje: id ? "Juego actualizado" : "Juego creado" };
}

// --- Registrar partida manualmente ------------------------------------------

const esquemaParticipante = z.object({
  userId: z.string().min(1),
  result: z.enum(["win", "loss", "draw"]),
  score: z.coerce.number().int().optional(),
  position: z.coerce.number().int().optional(),
});

const esquemaPartida = z.object({
  gameId: z.string().uuid("Elige un juego"),
  kind: z.enum(["practice", "ranked"]),
  notes: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
  participantes: z.array(esquemaParticipante).min(2, "Añade al menos 2 jugadores"),
});

/**
 * Registra una partida: una fila en `matches` y N en `match_participants`.
 * El payload de participantes llega como JSON en el campo `participantes`.
 */
export async function registrarPartida(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requireAdmin();

  let participantesRaw: unknown = [];
  try {
    participantesRaw = JSON.parse(String(formData.get("participantes") ?? "[]"));
  } catch {
    return { ok: false, mensaje: "Participantes con formato incorrecto" };
  }

  const parsed = esquemaPartida.safeParse({
    gameId: formData.get("gameId"),
    kind: formData.get("kind"),
    notes: formData.get("notes"),
    participantes: participantesRaw,
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }
  const { gameId, kind, notes, participantes } = parsed.data;

  // Inserta la cabecera y, si algo falla con los participantes, la deshace
  // (neon-http no tiene transacciones interactivas).
  const [match] = await db
    .insert(matches)
    .values({ gameId, kind, notes })
    .returning({ id: matches.id });

  try {
    await db.insert(matchParticipants).values(
      participantes.map((p) => ({
        matchId: match.id,
        userId: p.userId,
        result: p.result,
        score: p.score ?? null,
        position: p.position ?? null,
      })),
    );
  } catch {
    await db.delete(matches).where(eq(matches.id, match.id));
    return { ok: false, mensaje: "No se pudieron guardar los resultados" };
  }

  revalidatePath("/admin/partidas");
  revalidatePath("/estadisticas");
  return { ok: true, mensaje: "Partida registrada" };
}
