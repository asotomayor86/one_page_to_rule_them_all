"use client";

import { useActionState, useState } from "react";
import { crearSala, type ResultadoSala } from "@/actions/rooms";
import { Aviso, estiloCampo } from "@/components/ui";

type Juego = {
  id: string;
  name: string;
  icon: string | null;
  url: string;
  maxPlayers: number | null;
};
type Perfil = { id: string; nombre: string };

const inicial: ResultadoSala = { ok: false };

/** Formulario para crear una sala: elige juego + jugadores y devuelve el código. */
export function CreateRoomForm({
  juegos,
  perfiles,
  currentUserId,
}: {
  juegos: Juego[];
  perfiles: Perfil[];
  currentUserId: string;
}) {
  const [estado, accion, enviando] = useActionState(crearSala, inicial);
  const [gameId, setGameId] = useState("");
  // Por comodidad, el creador entra preseleccionado como jugador.
  const [sel, setSel] = useState<Set<string>>(new Set([currentUserId]));

  const juego = juegos.find((j) => j.id === gameId);
  const jugadoresJSON = JSON.stringify([...sel]);
  const max = juego?.maxPlayers ?? null;
  const excedeMax = max != null && sel.size > max;

  function toggle(id: string) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function abrirJuego(code: string) {
    if (!juego) return;
    const sep = juego.url.includes("?") ? "&" : "?";
    // Misma pestaña: cuando la partida termine, el juego redirige de vuelta al
    // hub (window.location.href = HUB_URL), así no se acumulan ventanas.
    window.location.href = `${juego.url}${sep}sala=${code}`;
  }

  if (juegos.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--texto-suave)" }}>
        No tienes ningún juego asignado todavía. Pide acceso a un administrador.
      </p>
    );
  }

  return (
    <form
      action={accion}
      style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
    >
      <input type="hidden" name="jugadores" value={jugadoresJSON} />

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: "1 1 160px",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>Juego</span>
          <select
            name="gameId"
            required
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            style={estiloCampo}
          >
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
            flex: "0 1 160px",
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
          <span style={{ color: excedeMax ? "var(--rojo)" : "var(--texto-suave)" }}>
            ({sel.size} seleccionados{max != null ? ` · máx ${max}` : ""})
          </span>
        </span>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
          }}
        >
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

      {excedeMax && (
        <Aviso tipo="error">
          {juego?.name} admite como máximo {max} jugadores. Quita {sel.size - max!}{" "}
          para poder crear la sala.
        </Aviso>
      )}

      <button
        type="submit"
        disabled={enviando || excedeMax}
        style={{
          padding: "0.6rem",
          borderRadius: 8,
          border: "none",
          background: excedeMax ? "var(--borde)" : "var(--acento-fuerte)",
          color: "white",
          fontWeight: 600,
          cursor: enviando || excedeMax ? "not-allowed" : "pointer",
        }}
      >
        {enviando ? "Creando…" : "Crear sala"}
      </button>

      {estado.mensaje && !estado.ok && (
        <Aviso tipo="error">{estado.mensaje}</Aviso>
      )}

      {estado.ok && estado.code && (
        <div
          style={{
            border: "1px solid var(--verde)",
            borderRadius: 10,
            padding: "0.9rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
            alignItems: "center",
          }}
        >
          <span style={{ color: "var(--texto-suave)", fontSize: "0.85rem" }}>
            Código de la sala
          </span>
          <strong style={{ fontSize: "2rem", letterSpacing: "0.2em" }}>
            {estado.code}
          </strong>
          <button
            type="button"
            onClick={() => abrirJuego(estado.code!)}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: 8,
              border: "none",
              background: "var(--verde)",
              color: "#04231a",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Abrir el juego con este código →
          </button>
          <span
            style={{
              color: "var(--texto-suave)",
              fontSize: "0.8rem",
              textAlign: "center",
            }}
          >
            Comparte el código con los jugadores: lo introducen en el juego para
            ocupar su sitio.
          </span>
        </div>
      )}
    </form>
  );
}
