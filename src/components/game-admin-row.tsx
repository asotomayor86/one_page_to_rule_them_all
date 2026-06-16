"use client";

import { useState } from "react";
import { eliminarJuego } from "@/actions/admin";
import { GameForm } from "@/components/game-form";
import type { Game } from "@/db/schema";

/**
 * Fila compacta de un juego en el panel de admin: una línea (icono, nombre,
 * estado y acciones) que se expande para mostrar el formulario de edición. Así
 * la lista no ocupa tanto alto. Incluye "Eliminar" con confirmación (borra en
 * cascada permisos, ligas, salas y el historial de partidas del juego).
 */
export function GameAdminRow({ juego }: { juego: Game }) {
  const [editando, setEditando] = useState(false);

  return (
    <div className="glass" style={{ borderRadius: 12, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 0.7rem",
        }}
      >
        <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{juego.icon || "🎮"}</span>
        <strong style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {juego.name}
        </strong>
        {!juego.active && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--texto-suave)",
              border: "1px solid var(--borde)",
              borderRadius: 6,
              padding: "0 0.4rem",
            }}
          >
            inactivo
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditando((v) => !v)}
          style={{
            border: "1px solid var(--borde)",
            background: editando ? "var(--superficie-2)" : "transparent",
            color: "var(--texto)",
            borderRadius: 8,
            padding: "0.3rem 0.7rem",
            fontSize: "0.82rem",
            cursor: "pointer",
          }}
        >
          {editando ? "Cerrar" : "Editar"}
        </button>
        <form
          action={eliminarJuego}
          onSubmit={(e) => {
            if (
              !confirm(
                `¿Eliminar «${juego.name}»? También se borrarán sus permisos, ligas, salas y todo su historial de partidas. Esta acción no se puede deshacer.`,
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={juego.id} />
          <button
            type="submit"
            title="Eliminar juego"
            style={{
              border: "1px solid var(--rojo)",
              background: "transparent",
              color: "var(--rojo)",
              borderRadius: 8,
              padding: "0.3rem 0.6rem",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            Eliminar
          </button>
        </form>
      </div>

      {editando && (
        <div style={{ padding: "0 0.7rem 0.7rem", borderTop: "1px solid var(--borde)" }}>
          <div style={{ height: "0.7rem" }} />
          <GameForm juego={juego} />
        </div>
      )}
    </div>
  );
}
