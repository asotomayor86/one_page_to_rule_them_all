import type { FilaClasificacion } from "@/db/queries/rooms";
import { Card } from "@/components/ui";

/** Tabla de clasificación de una liga (Pts = V·3 + E·1). Destaca al líder. */
export function ClasificacionTable({
  filas,
}: {
  filas: FilaClasificacion[];
}) {
  if (filas.length === 0) return null;

  const th: React.CSSProperties = {
    padding: "0.4rem 0.4rem",
    textAlign: "center",
    color: "var(--texto-suave)",
    fontSize: "0.78rem",
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = { padding: "0.4rem 0.4rem", textAlign: "center" };

  return (
    <Card style={{ padding: "0.6rem 0.8rem", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--borde)" }}>
            <th style={{ ...th, textAlign: "left" }}>#</th>
            <th style={{ ...th, textAlign: "left" }}>Jugador</th>
            <th style={th}>PJ</th>
            <th style={th}>V</th>
            <th style={th}>E</th>
            <th style={th}>D</th>
            <th style={th}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr
              key={f.userId}
              style={{
                borderBottom: "1px solid var(--borde)",
                background: i === 0 ? "rgba(245,196,81,0.08)" : "transparent",
              }}
            >
              <td style={{ ...td, textAlign: "left" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </td>
              <td
                style={{
                  ...td,
                  textAlign: "left",
                  fontWeight: i === 0 ? 700 : 400,
                }}
              >
                {f.nombre}
              </td>
              <td style={td}>{f.pj}</td>
              <td style={{ ...td, color: "var(--verde)" }}>{f.v}</td>
              <td style={{ ...td, color: "var(--oro)" }}>{f.e}</td>
              <td style={{ ...td, color: "var(--rojo)" }}>{f.d}</td>
              <td style={{ ...td, fontWeight: 700 }}>{f.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
