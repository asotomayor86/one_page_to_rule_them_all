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

  let nuevoId: string;
  try {
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
    nuevoId = data.user.id;

    // Crea/asegura el perfil con nombre y apodo.
    await db
      .insert(profiles)
      .values({ id: nuevoId, displayName, nickname })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { displayName, nickname },
      });
  } catch (e) {
    console.error("invitarUsuario error:", e);
    const detalle = e instanceof Error ? e.message : "error desconocido";
    return { ok: false, mensaje: `No se pudo invitar: ${detalle}` };
  }

  // Envía automáticamente el email para que la persona cree su contraseña
  // (enlace al /restablecer). Si fallara el correo, la invitación ya está hecha
  // y la persona puede usar igualmente «He olvidado mi contraseña».
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let correoEnviado = true;
  try {
    const { error } = await getAuth().requestPasswordReset({
      email,
      redirectTo: `${appUrl}/restablecer`,
    });
    if (error) correoEnviado = false;
  } catch (e) {
    console.error("invitarUsuario requestPasswordReset error:", e);
    correoEnviado = false;
  }

  revalidatePath("/admin/usuarios");
  return {
    ok: true,
    mensaje: correoEnviado
      ? `Invitado ${displayName}. Le hemos enviado un email a ${email} para que cree su contraseña.`
      : `Invitado ${displayName}, pero no se pudo enviar el email. Dile que entre y use «He olvidado mi contraseña» con ${email}.`,
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

// --- Eliminar usuario --------------------------------------------------------

/**
 * Elimina una cuenta: la borra de Neon Auth (Admin plugin) y su fila en
 * `profiles`. Por las FK en cascada, también desaparecen sus permisos
 * (user_games) y sus participaciones en partidas (match_participants).
 * No permite que un admin se borre a sí mismo.
 */
export async function eliminarUsuario(formData: FormData): Promise<void> {
  const { user } = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === user.id) return; // nunca borrarse a uno mismo

  // Borra la cuenta de autenticación (mejor esfuerzo).
  try {
    await getAuth().admin.removeUser({ userId });
  } catch (e) {
    console.error("eliminarUsuario removeUser error:", e);
  }

  // Borra el perfil (cascada → user_games y match_participants).
  await db.delete(profiles).where(eq(profiles.id, userId));

  revalidatePath("/admin/usuarios");
  revalidatePath("/estadisticas");
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
  // Antes rechazaba cualquier cosa que no fueran ya minúsculas/números/guiones
  // ("Solo minúsculas, números y guiones"), lo cual era muy fácil de disparar
  // sin querer (mayúsculas, espacios, acentos...). Ahora, en vez de rechazar,
  // lo normaliza: minúsculas, sin acentos, cualquier tramo de caracteres raros
  // se convierte en un guion. "Marvel Trivia" → "marvel-trivia".
  slug: z
    .string()
    .trim()
    .transform((v) =>
      v
        .toLowerCase()
        .normalize("NFD")
        .replace(new RegExp("[\\u0300-\\u036f]", "g"), "") // quita los acentos (tras NFD quedan sueltos)
        .replace(/[^a-z0-9]+/g, "-") // cualquier tramo no válido -> un guion
        .replace(/^-+|-+$/g, ""), // sin guiones sobrantes al principio/final
    )
    .pipe(z.string().min(2, "El slug es obligatorio").max(40)),
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
  // Máx. jugadores: vacío = sin límite; si se indica, entre 2 y 64.
  maxPlayers: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce
      .number()
      .int()
      .min(2, "El máximo de jugadores debe ser al menos 2")
      .max(64, "El máximo de jugadores es demasiado alto")
      .nullable(),
  ),
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
    maxPlayers: formData.get("maxPlayers"),
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

/**
 * Elimina un juego del catálogo. Por las FK con ON DELETE CASCADE, también
 * desaparecen sus permisos (user_games), sus ligas, sus salas y su historial de
 * partidas (matches + match_participants). Operación destructiva: la UI confirma.
 */
export async function eliminarJuego(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(games).where(eq(games.id, id));
  revalidatePath("/admin/juegos");
  revalidatePath("/hub");
  revalidatePath("/estadisticas");
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

// --- Eliminar partida --------------------------------------------------------

/**
 * Elimina una partida del historial (y, en cascada, sus participantes). Al
 * borrar la fila de `matches`, el ranking deja de contarla automáticamente —
 * `ranking()` agrega sobre `match_participants` y FK con ON DELETE CASCADE
 * propaga la limpieza.
 */
export async function eliminarPartida(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("matchId") ?? "");
  if (!id) return;
  await db.delete(matches).where(eq(matches.id, id));
  revalidatePath("/estadisticas");
  revalidatePath("/admin/partidas");
}
