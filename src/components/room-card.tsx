import type { Sala } from "@/db/queries/rooms";
import { cerrarSala } from "@/actions/rooms";
import { Card } from "@/components/ui";

function enlaceJuego(url: string, code: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sala=${code}`;
}

/** Tarjeta de una sala: código, juego, jugadores y enlace para abrir el juego. */
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
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <strong>
          {sala.jugadores.map((j) => j.nombre).join("  vs  ") ||
            (mostrarJuego ? sala.game.name : "Partido")}
        </strong>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "1.2rem",
            letterSpacing: "0.15em",
            background: "var(--superficie-2)",
            border: "1px solid var(--borde)",
            borderRadius: 8,
            padding: "0.1rem 0.6rem",
          }}
        >
          {sala.code}
        </span>
      </div>

      {mostrarJuego && (
        <div style={{ fontSize: "0.82rem", color: "var(--texto-suave)" }}>
          {(sala.game.icon || "🎮") + " " + sala.game.name}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <a
          href={enlaceJuego(sala.game.url, sala.code)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: 8,
            background: "var(--acento-fuerte)",
            color: "white",
            fontWeight: 600,
          }}
        >
          Abrir juego →
        </a>
        {allowClose && sala.createdBy === currentUserId && (
          <form action={cerrarSala}>
            <input type="hidden" name="roomId" value={sala.id} />
            <button
              type="submit"
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: 8,
                border: "1px solid var(--borde)",
                background: "transparent",
                color: "var(--texto-suave)",
                cursor: "pointer",
              }}
            >
              Cerrar sala
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}
