"use client";

import { useActionState } from "react";
import { guardarJuego, type ResultadoAccion } from "@/actions/admin";
import { Aviso, estiloCampo } from "@/components/ui";
import type { Game } from "@/db/schema";

const inicial: ResultadoAccion = { ok: false };

/** Formulario para crear (sin `juego`) o editar (con `juego`) un juego. */
export function GameForm({ juego }: { juego?: Game }) {
  const [estado, accion, enviando] = useActionState(guardarJuego, inicial);

  return (
    <form
      action={accion}
      style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
    >
      {juego && <input type="hidden" name="id" value={juego.id} />}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          name="name"
          required
          placeholder="Nombre"
          defaultValue={juego?.name ?? ""}
          maxLength={60}
          style={{ ...estiloCampo, flex: "2 1 160px" }}
        />
        <input
          name="slug"
          required
          placeholder="slug (se normaliza solo, ej: Marvel Trivia → marvel-trivia)"
          defaultValue={juego?.slug ?? ""}
          maxLength={60}
          style={{ ...estiloCampo, flex: "1 1 120px" }}
        />
        <input
          name="icon"
          placeholder="🎲"
          defaultValue={juego?.icon ?? ""}
          maxLength={8}
          style={{ ...estiloCampo, flex: "0 0 70px", textAlign: "center" }}
        />
      </div>
      <input
        name="url"
        type="url"
        required
        placeholder="https://mi-juego.vercel.app"
        defaultValue={juego?.url ?? ""}
        style={estiloCampo}
      />
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.9rem",
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>Máx. jugadores</span>
        <input
          name="maxPlayers"
          type="number"
          inputMode="numeric"
          min={2}
          max={64}
          placeholder="sin límite"
          defaultValue={juego?.maxPlayers ?? ""}
          style={{ ...estiloCampo, flex: "0 0 110px" }}
        />
        <span style={{ color: "var(--texto-suave)", fontSize: "0.8rem" }}>
          (vacío = sin límite)
        </span>
      </label>
      <input
        name="description"
        placeholder="Descripción (opcional)"
        defaultValue={juego?.description ?? ""}
        maxLength={200}
        style={estiloCampo}
      />
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.9rem",
        }}
      >
        <input
          type="checkbox"
          name="active"
          defaultChecked={juego?.active ?? true}
        />
        Activo (visible en el hub)
      </label>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.9rem",
        }}
      >
        <input
          type="checkbox"
          name="tracksWinLoss"
          defaultChecked={juego?.tracksWinLoss ?? true}
        />
        Cuenta victorias/derrotas en el ranking
        <span style={{ color: "var(--texto-suave)", fontSize: "0.8rem" }}>
          (desmárcalo para juegos de puntuación, p. ej. trivia — solo sumarán
          Puntos)
        </span>
      </label>
      <button
        type="submit"
        disabled={enviando}
        style={{
          padding: "0.55rem",
          borderRadius: 8,
          border: "none",
          background: juego ? "var(--superficie-2)" : "var(--acento-fuerte)",
          color: juego ? "var(--texto)" : "white",
          fontWeight: 600,
          cursor: enviando ? "wait" : "pointer",
          ...(juego ? { border: "1px solid var(--borde)" } : {}),
        }}
      >
        {enviando ? "Guardando…" : juego ? "Guardar cambios" : "Crear juego"}
      </button>
      {estado.mensaje && (
        <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
      )}
    </form>
  );
}
