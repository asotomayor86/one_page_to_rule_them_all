import type { PartidaHistorial } from "@/db/queries/stats";
import { Card } from "@/components/ui";
import { DeleteMatchButton } from "@/components/delete-match-button";

const etiquetaResultado: Record<string, { texto: string; color: string }> = {
  win: { texto: "Ganó", color: "var(--verde)" },
  loss: { texto: "Perdió", color: "var(--rojo)" },
  draw: { texto: "Empató", color: "var(--oro)" },
};

// Juegos de puntuación (sin ganar/perder real) con su propia etiqueta —
// win/loss se sigue guardando internamente (p. ej. ≥6/10 en Marvel Trivia),
// pero aquí no se trata de "ganar": se informa cuántas acertó, punto.
const etiquetaPorJuego: Record<string, { texto: string; color: string }> = {
  "marvel-trivia": { texto: "Acertó", color: "var(--verde)" },
};

function etiquetaDe(gameSlug: string, result: string) {
  return etiquetaPorJuego[gameSlug] ?? etiquetaResultado[result];
}

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
}

/** Lista de partidas recientes con sus participantes y resultados (una por línea). */
export function HistorialLista({
  partidas,
  esAdmin = false,
}: {
  partidas: PartidaHistorial[];
  esAdmin?: boolean;
}) {
  if (partidas.length === 0) {
    return (
      <Card>
        <p style={{ margin: 0, color: "var(--texto-suave)" }}>
          Todavía no hay partidas registradas.
        </p>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      {partidas.map((p) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.45rem 0.7rem",
            background: "var(--superficie)",
            border: "1px solid var(--borde)",
            borderRadius: 8,
            fontSize: "0.85rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
            {(p.gameIcon || "🎮") + " " + p.gameName}
          </span>
          {p.kind === "practice" && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--texto-suave)",
                border: "1px solid var(--borde)",
                borderRadius: 6,
                padding: "0 0.35rem",
                whiteSpace: "nowrap",
              }}
              title="No cuenta para el ranking"
            >
              práctica
            </span>
          )}
          <span style={{ color: "var(--texto-suave)", whiteSpace: "nowrap" }}>
            {formatearFecha(p.playedAt)}
          </span>
          <span
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.35rem",
              flex: 1,
              minWidth: 0,
            }}
          >
            {p.participantes.map((part, i) => {
              const e = etiquetaDe(p.gameSlug, part.result);
              return (
                <span key={i} style={{ whiteSpace: "nowrap" }}>
                  {i > 0 && (
                    <span style={{ color: "var(--texto-suave)" }}> · </span>
                  )}
                  {part.nombre}{" "}
                  <span style={{ color: e.color, fontWeight: 600 }}>
                    {e.texto}
                  </span>
                  {part.score !== null && (
                    <span style={{ color: "var(--texto-suave)" }}>
                      {" "}
                      ({part.score})
                    </span>
                  )}
                </span>
              );
            })}
          </span>
          {esAdmin && (
            <DeleteMatchButton
              matchId={p.id}
              resumen={`${p.gameName} · ${formatearFecha(p.playedAt)} · ${p.participantes
                .map((pa) => `${pa.nombre} ${etiquetaDe(p.gameSlug, pa.result).texto}`)
                .join(" / ")}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
