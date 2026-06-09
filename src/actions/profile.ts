"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, profiles } from "@/db";
import { getCurrentUser } from "@/auth/helpers";

const esquema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(40, "El nombre es demasiado largo"),
  nickname: z
    .string()
    .trim()
    .max(24, "El apodo es demasiado largo")
    .optional()
    .transform((v) => (v ? v : null)),
});

export type ResultadoAccion = { ok: boolean; mensaje?: string };

/** Actualiza el nombre y el apodo del usuario actual en `profiles`. */
export async function actualizarPerfil(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  // Lee la sesión sin redirigir (en una Server Action redirigir se percibe como
  // "fallo"); si no hay sesión, lo decimos claramente.
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      mensaje: "Tu sesión ha caducado. Recarga la página e inténtalo de nuevo.",
    };
  }

  const parsed = esquema.safeParse({
    displayName: formData.get("displayName"),
    nickname: formData.get("nickname"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }

  try {
    // Upsert: funciona aunque (por lo que sea) aún no exista la fila de perfil.
    await db
      .insert(profiles)
      .values({
        id: user.id,
        displayName: parsed.data.displayName,
        nickname: parsed.data.nickname,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          displayName: parsed.data.displayName,
          nickname: parsed.data.nickname,
        },
      });
  } catch (e) {
    console.error("actualizarPerfil error:", e);
    // Mensaje con detalle temporal para diagnosticar en producción.
    const detalle = e instanceof Error ? e.message : "error desconocido";
    return { ok: false, mensaje: `No se pudo guardar: ${detalle}` };
  }

  revalidatePath("/perfil");
  revalidatePath("/estadisticas");
  return { ok: true, mensaje: "Perfil actualizado" };
}
