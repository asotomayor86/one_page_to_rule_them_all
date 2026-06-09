"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, profiles } from "@/db";
import { requireUser } from "@/auth/helpers";

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
  const { user } = await requireUser();

  const parsed = esquema.safeParse({
    displayName: formData.get("displayName"),
    nickname: formData.get("nickname"),
  });

  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message };
  }

  await db
    .update(profiles)
    .set({
      displayName: parsed.data.displayName,
      nickname: parsed.data.nickname,
    })
    .where(eq(profiles.id, user.id));

  revalidatePath("/perfil");
  revalidatePath("/estadisticas");
  return { ok: true, mensaje: "Perfil actualizado" };
}
