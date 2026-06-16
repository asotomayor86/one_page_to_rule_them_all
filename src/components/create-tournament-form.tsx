"use client";

import { useActionState, useState } from "react";
import { crearTorneo, type ResultadoSala } from "@/actions/rooms";
import { Aviso, estiloCampo } from "@/components/ui";

type Juego = { id: string; name: string; icon: string | null };
type Perfil = { id: string; nombre: string };

const inicial: ResultadoSala = { ok: false };

/** Menor potencia de 2 ≥ n (mínimo 4). */
function tamanoCuadro(n: number): number {
  let b = 4;
  while (b < n) b *= 2;
  return b;
}

/** Crea un torneo eliminatorio: nombre, juego, victorias por cruce y jugadores. */
export function CreateTournamentForm({
  juegos,
  perfiles,
  currentUserId,
}: {
  juegos: Juego[];
  perfiles: Perfil[];
  currentUserId: string;
}) {
  const [estado, accion, enviando] = useActionState(crearTorneo, inicial);
  const [sel, setSel] = useState<Set<string>>(new Set([currentUserId]));

  const jugadoresJSON = JSON.stringify([...sel]);
  const n = sel.size;
  const cuadro = n >= 4 ? tamanoCuadro(n) : 0;
  const byes = cuadro > 0 ? cuadro - n : 0;

  function toggle(id: string) {
    setSel((prev) => {
      const x = new Set(prev);
      if (x.has(id)) x.delete(id);
      else x.add(id);
      return x;
    });
  }

  if (juegos.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--texto-suave)" }}>
        No hay juegos disponibles todavía.
      </p>
    );
  }

  return (
    <form
      action={accion}
      style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
    >
      <input type="hidden" name="jugadores" value={jugadoresJSON} />

      <input
        name="nombre"
        required
        placeholder="Nombre del torneo (p. ej. Copa de Verano)"
        maxLength={60}
        style={estiloCampo}
      />

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: "1 1 140px",
          }}
        >
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
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: "0 1 170px",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>Victorias para pasar de ronda</span>
          <select name="victorias" defaultValue={1} style={estiloCampo}>
            <option value={1}>A 1 victoria</option>
            <option value={2}>A 2 victorias</option>
            <option value={3}>A 3 victorias</option>
            <option value={4}>A 4 victorias</option>
            <option value={5}>A 5 victorias</option>
          </select>
        </label>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "0.9rem" }}>
          Jugadores <span style={{ color: "var(--texto-suave)" }}>({n})</span>
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {perfiles.map((p) => {
            const activo = sel.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                style={{
                  fontSize: "0.85rem",
                  padding: "0.3rem 0.7rem",
                  borderRadius: 999,
                  cursor: "pointer",
                  border: "1px solid var(--borde)",
                  background: activo ? "var(--acento-fuerte)" : "transparent",
                  color: activo ? "white" : "var(--texto-suave)",
                }}
              >
                {activo ? "✓ " : ""}
                {p.nombre}
                {p.id === currentUserId ? " (tú)" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--texto-suave)" }}>
        {n < 4 ? (
          <>Hacen falta al menos <strong>4</strong> jugadores.</>
        ) : (
          <>
            Cuadro de <strong>{cuadro}</strong> · eliminatorio a un partido
            {byes > 0 && (
              <>
                {" · "}
                <strong>{byes}</strong> jugador(es) pasan de la primera ronda
                (bye)
              </>
            )}
            .
          </>
        )}
      </p>

      <button
        type="submit"
        disabled={enviando || n < 4}
        style={{
          padding: "0.6rem",
          borderRadius: 8,
          border: "none",
          background: n < 4 ? "var(--borde)" : "var(--acento-fuerte)",
          color: "white",
          fontWeight: 600,
          cursor: enviando || n < 4 ? "not-allowed" : "pointer",
        }}
      >
        {enviando ? "Creando torneo…" : "Crear torneo"}
      </button>

      {estado.mensaje && (
        <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
      )}
    </form>
  );
}
