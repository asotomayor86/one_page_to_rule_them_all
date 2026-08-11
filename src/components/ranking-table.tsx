"use client";

import { useState } from "react";
import type { FilaRanking } from "@/db/queries/stats";

type Columna = keyof Pick<
  FilaRanking,
  "jugadas" | "victorias" | "derrotas" | "empates" | "porcentajeVictoria" | "puntos"
>;

const columnas: { key: Columna; label: string }[] = [
  { key: "jugadas", label: "PJ" },
  { key: "victorias", label: "V" },
  { key: "derrotas", label: "D" },
  { key: "empates", label: "E" },
  { key: "porcentajeVictoria", label: "% Vic." },
  // Suma de `score` — solo es != 0 en juegos que registran puntuación
  // numérica. Por ahora el único es Marvel Trivia, de ahí la etiqueta; si en
  // el futuro hay más juegos de puntuación, conviene volver a un "Pts"
  // genérico (o una columna por juego).
  { key: "puntos", label: "Marvel Trivia" },
];

/** Tabla de ranking ordenable (clic en cabeceras). El líder se destaca. */
export function RankingTable({ filas }: { filas: FilaRanking[] }) {
  const [orden, setOrden] = useState<Columna>("victorias");
  const [desc, setDesc] = useState(true);

  if (filas.length === 0) {
    return (
      <p style={{ color: "var(--texto-suave)" }}>
        Aún no hay partidas oficiales para este ranking.
      </p>
    );
  }

  const ordenadas = [...filas].sort((a, b) => {
    const d = Number(a[orden]) - Number(b[orden]);
    return desc ? -d : d;
  });

  function ordenarPor(c: Columna) {
    if (c === orden) setDesc((v) => !v);
    else {
      setOrden(c);
      setDesc(true);
    }
  }

  const thStyle: React.CSSProperties = {
    padding: "0.5rem 0.4rem",
    textAlign: "center",
    cursor: "pointer",
    color: "var(--texto-suave)",
    fontSize: "0.8rem",
    userSelect: "none",
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.5rem 0.4rem",
    textAlign: "center",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--borde)" }}>
            <th style={{ ...thStyle, textAlign: "left" }}>#</th>
            <th style={{ ...thStyle, textAlign: "left" }}>Jugador</th>
            {columnas.map((c) => (
              <th
                key={c.key}
                style={thStyle}
                onClick={() => ordenarPor(c.key)}
                title="Ordenar"
              >
                {c.label}
                {orden === c.key ? (desc ? " ↓" : " ↑") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((f, i) => (
            <tr
              key={f.userId}
              style={{
                borderBottom: "1px solid var(--borde)",
                background: i === 0 ? "rgba(245,196,81,0.08)" : "transparent",
              }}
            >
              <td style={{ ...tdStyle, textAlign: "left" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: "left",
                  fontWeight: i === 0 ? 700 : 400,
                }}
              >
                {f.nombre}
              </td>
              <td style={tdStyle}>{f.jugadas}</td>
              <td style={{ ...tdStyle, color: "var(--verde)" }}>{f.victorias}</td>
              <td style={{ ...tdStyle, color: "var(--rojo)" }}>{f.derrotas}</td>
              <td style={{ ...tdStyle, color: "var(--oro)" }}>{f.empates}</td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>
                {f.porcentajeVictoria}%
              </td>
              <td style={{ ...tdStyle, fontWeight: 600, color: "var(--oro)" }}>
                {f.puntos}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
