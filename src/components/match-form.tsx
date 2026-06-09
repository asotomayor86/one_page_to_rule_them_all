"use client";

import { useActionState, useState } from "react";
import { registrarPartida, type ResultadoAccion } from "@/actions/admin";
import { Aviso, estiloCampo } from "@/components/ui";

type Juego = { id: string; name: string; icon: string | null };
type Perfil = { id: string; displayName: string; nickname: string | null };

type FilaParticipante = {
  userId: string;
  result: "win" | "loss" | "draw";
  score: string;
  position: string;
};

const inicial: ResultadoAccion = { ok: false };

function filaVacia(): FilaParticipante {
  return { userId: "", result: "loss", score: "", position: "" };
}

/** Formulario para registrar una partida con sus participantes (solo admin). */
export function MatchForm({
  juegos,
  perfiles,
}: {
  juegos: Juego[];
  perfiles: Perfil[];
}) {
  const [estado, accion, enviando] = useActionState(registrarPartida, inicial);
  const [filas, setFilas] = useState<FilaParticipante[]>([
    filaVacia(),
    filaVacia(),
  ]);

  // El payload de participantes viaja como JSON en un input oculto.
  const participantesJSON = JSON.stringify(
    filas
      .filter((f) => f.userId)
      .map((f) => ({
        userId: f.userId,
        result: f.result,
        score: f.score === "" ? undefined : Number(f.score),
        position: f.position === "" ? undefined : Number(f.position),
      })),
  );

  function actualizar(i: number, cambio: Partial<FilaParticipante>) {
    setFilas((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, ...cambio } : f)),
    );
  }

  return (
    <form
      action={accion}
      style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}
    >
      <input type="hidden" name="participantes" value={participantesJSON} />

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: "0.9rem" }}>Juego</span>
        <select name="gameId" required defaultValue="" style={estiloCampo}>
          <option value="" disabled>
            Elige un juego…
          </option>
          {juegos.map((j) => (
            <option key={j.id} value={j.id}>
              {(j.icon || "🎮") + " " + j.name}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: "0.9rem" }}>Tipo</span>
        <select name="kind" defaultValue="ranked" style={estiloCampo}>
          <option value="ranked">Oficial (cuenta para el ranking)</option>
          <option value="practice">Práctica (no cuenta)</option>
        </select>
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.9rem" }}>Participantes</span>
        {filas.map((f, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}
          >
            <select
              value={f.userId}
              onChange={(e) => actualizar(i, { userId: e.target.value })}
              style={{ ...estiloCampo, flex: "2 1 130px" }}
            >
              <option value="">Jugador…</option>
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname || p.displayName}
                </option>
              ))}
            </select>
            <select
              value={f.result}
              onChange={(e) =>
                actualizar(i, {
                  result: e.target.value as FilaParticipante["result"],
                })
              }
              style={{ ...estiloCampo, flex: "1 1 90px" }}
            >
              <option value="win">Ganó</option>
              <option value="loss">Perdió</option>
              <option value="draw">Empató</option>
            </select>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Pts"
              value={f.score}
              onChange={(e) => actualizar(i, { score: e.target.value })}
              style={{ ...estiloCampo, flex: "0 1 70px" }}
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="Pos"
              value={f.position}
              onChange={(e) => actualizar(i, { position: e.target.value })}
              style={{ ...estiloCampo, flex: "0 1 70px" }}
            />
            {filas.length > 2 && (
              <button
                type="button"
                onClick={() =>
                  setFilas((prev) => prev.filter((_, idx) => idx !== i))
                }
                title="Quitar"
                style={{
                  border: "1px solid var(--borde)",
                  background: "transparent",
                  color: "var(--rojo)",
                  borderRadius: 8,
                  cursor: "pointer",
                  padding: "0 0.6rem",
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setFilas((prev) => [...prev, filaVacia()])}
          style={{
            alignSelf: "flex-start",
            border: "1px dashed var(--borde)",
            background: "transparent",
            color: "var(--texto-suave)",
            borderRadius: 8,
            padding: "0.35rem 0.7rem",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          + Añadir jugador
        </button>
      </div>

      <input
        name="notes"
        placeholder="Notas (opcional)"
        maxLength={200}
        style={estiloCampo}
      />

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
        {enviando ? "Guardando…" : "Registrar partida"}
      </button>
      {estado.mensaje && (
        <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
      )}
    </form>
  );
}
