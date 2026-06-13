"use client";

import { useActionState, useState } from "react";
import { crearLiga, type ResultadoSala } from "@/actions/rooms";
import { Aviso, estiloCampo } from "@/components/ui";

type Juego = { id: string; name: string; icon: string | null };
type Perfil = { id: string; nombre: string };

const inicial: ResultadoSala = { ok: false };

/** Crea una liga (todos contra todos): nombre, juego, vueltas y jugadores. */
export function CreateLeagueForm({
  juegos,
  perfiles,
  currentUserId,
}: {
  juegos: Juego[];
  perfiles: Perfil[];
  currentUserId: string;
}) {
  const [estado, accion, enviando] = useActionState(crearLiga, inicial);
  const [vueltas, setVueltas] = useState(1);
  const [sel, setSel] = useState<Set<string>>(new Set([currentUserId]));

  const jugadoresJSON = JSON.stringify([...sel]);
  const n = sel.size;
  // Partidos = parejas (n·(n-1)/2) × vueltas.
  const partidos = n >= 2 ? ((n * (n - 1)) / 2) * vueltas : 0;

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
        No tienes ningún juego asignado todavía.
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
        placeholder="Nombre de la liga (p. ej. Liga de Verano)"
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
            flex: "0 1 130px",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>Vueltas</span>
          <select
            name="vueltas"
            value={vueltas}
            onChange={(e) => setVueltas(Number(e.target.value))}
            style={estiloCampo}
          >
            <option value={1}>1 vuelta</option>
            <option value={2}>2 vueltas (ida y vuelta)</option>
            <option value={3}>3 vueltas</option>
            <option value={4}>4 vueltas</option>
          </select>
        </label>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: "0 1 150px",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>Victorias por partido</span>
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
          Jugadores{" "}
          <span style={{ color: "var(--texto-suave)" }}>({n})</span>
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
        Todos contra todos · se generarán <strong>{partidos}</strong> partido(s).
      </p>

      <button
        type="submit"
        disabled={enviando || n < 2}
        style={{
          padding: "0.6rem",
          borderRadius: 8,
          border: "none",
          background: n < 2 ? "var(--borde)" : "var(--acento-fuerte)",
          color: "white",
          fontWeight: 600,
          cursor: enviando || n < 2 ? "not-allowed" : "pointer",
        }}
      >
        {enviando ? "Creando liga…" : "Crear liga"}
      </button>

      {estado.mensaje && (
        <Aviso tipo={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso>
      )}
    </form>
  );
}
