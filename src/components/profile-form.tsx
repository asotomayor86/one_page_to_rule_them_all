"use client";

import { useActionState } from "react";
import {
  actualizarPerfil,
  type ResultadoAccion,
} from "@/actions/profile";
import { Aviso, estiloCampo } from "@/components/ui";

type Props = {
  displayName: string;
  nickname: string | null;
};

const estadoInicial: ResultadoAccion = { ok: false };

/** Formulario para editar nombre y apodo (escribe en `profiles`). */
export function ProfileForm({ displayName, nickname }: Props) {
  const [estado, accion, enviando] = useActionState(
    actualizarPerfil,
    estadoInicial,
  );

  return (
    <form
      action={accion}
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: "0.9rem" }}>Nombre</span>
        <input
          name="displayName"
          defaultValue={displayName}
          required
          maxLength={40}
          style={estiloCampo}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: "0.9rem" }}>
          Apodo{" "}
          <span style={{ color: "var(--texto-suave)" }}>(opcional)</span>
        </span>
        <input
          name="nickname"
          defaultValue={nickname ?? ""}
          maxLength={24}
          placeholder="Cómo quieres aparecer en los rankings"
          style={estiloCampo}
        />
      </label>

      <button
        type="submit"
        disabled={enviando}
        style={{
          padding: "0.6rem",
          borderRadius: 8,
          border: "none",
          background: "var(--acento-fuerte)",
          color: "white",
          fontWeight: 600,
          cursor: enviando ? "wait" : "pointer",
        }}
      >
        {enviando ? "Guardando…" : "Guardar cambios"}
      </button>

      {estado.mensaje && (
        <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
      )}
    </form>
  );
}
