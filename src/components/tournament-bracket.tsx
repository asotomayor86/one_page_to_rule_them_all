import type { Torneo, CruceTorneo } from "@/db/queries/tournaments";

function enlaceJuego(url: string, code: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sala=${code}`;
}

// Geometría del cuadro (px). Cada cruce de la ronda r ocupa una banda de alto
// SLOT·2^r, así su tarjeta queda centrada entre las dos de la ronda anterior
// (forma de pirámide). Con estas posiciones trazamos las líneas conectoras.
const CARD_W = 168;
const CARD_H = 72;
const SLOT = CARD_H + 26; // banda vertical de un cruce en la 1ª ronda
const H_GAP = 46; // separación horizontal entre rondas (espacio para las líneas)
const COL = CARD_W + H_GAP;
const HEADER = 24; // hueco arriba para el título de cada ronda
const LINEA = "rgba(155, 140, 255, 0.45)";

type Linea = { left: number; top: number; width: number; height: number };

/** Cuadro de un torneo en forma de pirámide, con líneas entre cruces. */
export function TournamentBracket({
  torneo,
  currentUserId,
}: {
  torneo: Torneo;
  currentUserId: string;
}) {
  const rondasN = torneo.rondas.length;
  const round0 = torneo.bracketSize / 2;
  const totalH = SLOT * round0;
  const totalW = rondasN > 0 ? (rondasN - 1) * COL + CARD_W : CARD_W;

  // Cruce por (ronda, slot) para colocarlos por su posición real.
  const porRS = new Map<string, CruceTorneo>();
  for (const ronda of torneo.rondas) {
    for (const c of ronda.cruces) porRS.set(`${c.round}:${c.slot}`, c);
  }

  const centroY = (r: number, s: number) => (s + 0.5) * SLOT * 2 ** r;

  // Líneas conectoras: entre la ronda r y r+1, para cada cruce destino.
  const lineas: Linea[] = [];
  for (let r = 0; r < rondasN - 1; r++) {
    const destinos = torneo.bracketSize / 2 ** (r + 2);
    for (let s2 = 0; s2 < destinos; s2++) {
      const topY = centroY(r, 2 * s2);
      const botY = centroY(r, 2 * s2 + 1);
      const midY = centroY(r + 1, s2);
      const xDer = r * COL + CARD_W;
      const xVert = xDer + H_GAP / 2;
      // Salidas de los dos cruces de origen.
      lineas.push({ left: xDer, top: topY, width: H_GAP / 2, height: 2 });
      lineas.push({ left: xDer, top: botY, width: H_GAP / 2, height: 2 });
      // Vertical que une las dos salidas.
      lineas.push({ left: xVert, top: topY, width: 2, height: botY - topY });
      // Entrada al cruce destino.
      lineas.push({ left: xVert, top: midY, width: H_GAP / 2, height: 2 });
    }
  }

  return (
    <div>
      {torneo.champion && (
        <div
          style={{
            margin: "0 0 0.6rem",
            padding: "0.5rem 0.8rem",
            borderRadius: 10,
            background: "rgba(245, 196, 81, 0.12)",
            border: "1px solid var(--oro)",
            color: "var(--texto)",
            fontWeight: 700,
          }}
        >
          🏆 Campeón: {torneo.champion.nombre}
        </div>
      )}

      <div style={{ overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div style={{ position: "relative", width: totalW, height: totalH + HEADER }}>
          {/* Líneas conectoras (debajo de las tarjetas). */}
          {lineas.map((l, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: l.left,
                top: l.top + HEADER - (l.height > 2 ? 0 : 1),
                width: l.width,
                height: l.height,
                background: LINEA,
              }}
            />
          ))}

          {/* Nombres de ronda, alineados a la primera tarjeta de cada columna. */}
          {torneo.rondas.map((ronda) => (
            <div
              key={`h${ronda.round}`}
              style={{
                position: "absolute",
                left: ronda.round * COL,
                top: centroY(ronda.round, 0) - CARD_H / 2 - 20 + HEADER,
                width: CARD_W,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--texto-suave)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                textAlign: "center",
              }}
            >
              {ronda.nombre}
            </div>
          ))}

          {/* Tarjetas de cada cruce, posicionadas por (ronda, slot). */}
          {torneo.rondas.flatMap((ronda) =>
            Array.from({ length: torneo.bracketSize / 2 ** (ronda.round + 1) }).map(
              (_, s) => {
                const c = porRS.get(`${ronda.round}:${s}`);
                if (!c) return null;
                return (
                  <CruceCard
                    key={`${ronda.round}:${s}`}
                    cruce={c}
                    gameUrl={torneo.game.url}
                    currentUserId={currentUserId}
                    left={ronda.round * COL}
                    top={centroY(ronda.round, s) - CARD_H / 2 + HEADER}
                  />
                );
              },
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function CruceCard({
  cruce,
  gameUrl,
  currentUserId,
  left,
  top,
}: {
  cruce: CruceTorneo;
  gameUrl: string;
  currentUserId: string;
  left: number;
  top: number;
}) {
  const jugado = !!cruce.winnerId;
  const completo = !!cruce.p1 && !!cruce.p2;
  const soy =
    currentUserId === cruce.p1?.userId || currentUserId === cruce.p2?.userId;
  const abrible =
    completo && !jugado && cruce.status === "open" && !!cruce.code && soy;

  return (
    <div
      className="glass"
      style={{
        position: "absolute",
        left,
        top,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 10,
        padding: "0.35rem 0.5rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "0.2rem",
        boxSizing: "border-box",
      }}
    >
      <Lado nombre={cruce.p1?.nombre ?? null} ganador={cruce.winnerId === cruce.p1?.userId} />
      <div style={{ height: 1, background: "var(--borde)" }} />
      <Lado
        nombre={cruce.esBye ? null : cruce.p2?.nombre ?? null}
        ganador={cruce.winnerId === cruce.p2?.userId}
        bye={cruce.esBye}
      />

      <div style={{ marginTop: "0.1rem", minHeight: 16 }}>
        {cruce.esBye ? (
          <Etiqueta texto="🎟️ Pasa de ronda" />
        ) : jugado ? (
          <Etiqueta texto="✓ Jugado" color="var(--verde)" />
        ) : abrible && cruce.code ? (
          <a
            href={enlaceJuego(gameUrl, cruce.code)}
            style={{
              color: "var(--acento)",
              fontWeight: 700,
              fontSize: "0.8rem",
            }}
          >
            Jugar →
          </a>
        ) : completo ? (
          <Etiqueta texto="En juego" />
        ) : (
          <Etiqueta texto="Por determinar" />
        )}
      </div>
    </div>
  );
}

function Lado({
  nombre,
  ganador,
  bye = false,
}: {
  nombre: string | null;
  ganador?: boolean;
  bye?: boolean;
}) {
  return (
    <div
      style={{
        fontSize: "0.84rem",
        lineHeight: 1.15,
        fontWeight: ganador ? 700 : 400,
        color: nombre ? "var(--texto)" : "var(--texto-suave)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
      }}
    >
      {ganador && <span aria-hidden>▶</span>}
      {bye ? <em style={{ color: "var(--texto-suave)" }}>(sin rival)</em> : nombre ?? "—"}
    </div>
  );
}

function Etiqueta({ texto, color }: { texto: string; color?: string }) {
  return (
    <span style={{ fontSize: "0.74rem", color: color ?? "var(--texto-suave)" }}>
      {texto}
    </span>
  );
}
