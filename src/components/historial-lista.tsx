import type { PartidaHistorial } from "@/db/queries/stats";
import { Card } from "@/components/ui";

const etiquetaResultado: Record<string, { texto: string; color: string }> = {
  win: { texto: "Ganó", color: "var(--verde)" },
  loss: { texto: "Perdió", color: "var(--rojo)" },
  draw: { texto: "Empató", color: "var(--oro)" },
};

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
}

/** Lista de partidas recientes con sus participantes y resultados. */
export function HistorialLista({
  partidas,
}: {
  partidas: PartidaHistorial[];
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
    <div style={{ display: "grid", gap: "0.7rem" }}>
      {partidas.map((p) => (
        <Card key={p.id}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <strong>
              {(p.gameIcon || "🎮") + " " + p.gameName}
              {p.kind === "practice" && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: "0.7rem",
                    color: "var(--texto-suave)",
                    border: "1px solid var(--borde)",
                    borderRadius: 6,
                    padding: "0 0.35rem",
                  }}
                >
                  práctica
                </span>
              )}
            </strong>
            <span style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>
              {formatearFecha(p.playedAt)}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {p.participantes.map((part, i) => {
              const e = etiquetaResultado[part.result];
              return (
                <span
                  key={i}
                  style={{
                    fontSize: "0.85rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: 8,
                    background: "var(--superficie-2)",
                    border: "1px solid var(--borde)",
                  }}
                >
                  {part.nombre}{" "}
                  <span style={{ color: e.color, fontWeight: 600 }}>
                    {e.texto}
                  </span>
                  {part.score !== null && (
                    <span style={{ color: "var(--texto-suave)" }}>
                      {" "}
                      · {part.score}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
