import type { Sala } from "@/db/queries/rooms";
import { cerrarSala } from "@/actions/rooms";
import { Card } from "@/components/ui";

function enlaceJuego(url: string, code: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sala=${code}`;
}

/** Tarjeta compacta de una sala: jugadores, código y acción (abrir / jugado). */
export function RoomCard({
  sala,
  currentUserId,
  allowClose = false,
  mostrarJuego = true,
}: {
  sala: Sala;
  currentUserId: string;
  allowClose?: boolean;
  mostrarJuego?: boolean;
}) {
  const jugada = sala.status === "closed";

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "0.4rem", padding: "0.6rem 0.75rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: "0.95rem" }}>
          {sala.jugadores.map((j) => j.nombre).join("  vs  ") ||
            (mostrarJuego ? sala.game.name : "Partido")}
        </strong>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "1rem",
            letterSpacing: "0.12em",
            color: jugada ? "var(--texto-suave)" : "var(--texto)",
            background: "var(--superficie-2)",
            border: "1px solid var(--borde)",
            borderRadius: 7,
            padding: "0.05rem 0.5rem",
          }}
        >
          {sala.code}
        </span>
      </div>

      {mostrarJuego && (
        <div style={{ fontSize: "0.78rem", color: "var(--texto-suave)" }}>
          {(sala.game.icon || "🎮") + " " + sala.game.name}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        {jugada ? (
          <span
            style={{
              padding: "0.3rem 0.7rem",
              borderRadius: 7,
              fontSize: "0.85rem",
              color: "var(--verde)",
              border: "1px solid var(--borde)",
            }}
          >
            ✓ Jugado
          </span>
        ) : (
          <a
            href={enlaceJuego(sala.game.url, sala.code)}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: 7,
              background: "var(--acento-fuerte)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            Abrir juego →
          </a>
        )}
        {allowClose && !jugada && sala.createdBy === currentUserId && (
          <form action={cerrarSala}>
            <input type="hidden" name="roomId" value={sala.id} />
            <button
              type="submit"
              style={{
                padding: "0.35rem 0.8rem",
                borderRadius: 7,
                border: "1px solid var(--borde)",
                background: "transparent",
                color: "var(--texto-suave)",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Cerrar
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}
