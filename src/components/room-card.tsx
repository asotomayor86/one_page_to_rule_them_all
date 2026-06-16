import type { Sala } from "@/db/queries/rooms";
import { cerrarSala } from "@/actions/rooms";
import { Card } from "@/components/ui";

function enlaceJuego(url: string, code: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sala=${code}`;
}

// Color según el origen del partido: sala suelta, liga o torneo. Sirve para
// distinguir de un vistazo de dónde viene cada tarjeta en la portada del hub.
const COLOR_INDIVIDUAL = "#9b8cff"; // lila
const COLOR_LIGA = "#f5c451"; // dorado
const COLOR_TORNEO = "#46c98b"; // verde

function colorOrigen(sala: Sala): string {
  if (sala.tournamentId) return COLOR_TORNEO;
  if (sala.leagueId) return COLOR_LIGA;
  return COLOR_INDIVIDUAL;
}

/**
 * Tarjeta de un partido pendiente. SIEMPRE en 4 líneas (jugadores, juego, código,
 * abrir juego) e idéntica en todos los sitios (portada, salas, ligas y torneos).
 * El borde y el botón se tiñen según el origen (sala suelta / liga / torneo).
 */
export function RoomCard({
  sala,
  currentUserId,
  allowClose = false,
}: {
  sala: Sala;
  currentUserId: string;
  allowClose?: boolean;
}) {
  const jugada = sala.status === "closed";
  const color = colorOrigen(sala);

  return (
    <Card
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        padding: "0.5rem 0.7rem",
        borderLeft: `4px solid ${color}`,
      }}
    >
      {/* 1) Jugadores */}
      <strong style={{ fontSize: "0.95rem" }}>
        {sala.jugadores.map((j) => j.nombre).join("  vs  ") || sala.game.name}
      </strong>

      {/* 2) Juego */}
      <div style={{ fontSize: "0.78rem", color: "var(--texto-suave)" }}>
        {(sala.game.icon || "🎮") + " " + sala.game.name}
      </div>

      {/* 3) Abrir juego (con el código de la sala) */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.1rem" }}>
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
              background: color,
              color: "#15122b",
              fontWeight: 700,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              letterSpacing: "0.08em",
            }}
          >
            {sala.code} →
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
