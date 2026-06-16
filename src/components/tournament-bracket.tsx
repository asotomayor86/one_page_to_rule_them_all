import type { Torneo, CruceTorneo } from "@/db/queries/tournaments";

function enlaceJuego(url: string, code: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sala=${code}`;
}

/** Cuadro de un torneo: rondas en columnas con scroll horizontal. */
export function TournamentBracket({
  torneo,
  currentUserId,
}: {
  torneo: Torneo;
  currentUserId: string;
}) {
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

      <div
        style={{
          display: "flex",
          gap: "0.8rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
        }}
      >
        {torneo.rondas.map((ronda) => (
          <div
            key={ronda.round}
            style={{
              flex: "0 0 auto",
              minWidth: 190,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--texto-suave)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {ronda.nombre}
            </div>
            {ronda.cruces.map((c) => (
              <CruceCard
                key={`${c.round}:${c.slot}`}
                cruce={c}
                gameUrl={torneo.game.url}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CruceCard({
  cruce,
  gameUrl,
  currentUserId,
}: {
  cruce: CruceTorneo;
  gameUrl: string;
  currentUserId: string;
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
        borderRadius: 10,
        padding: "0.45rem 0.55rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
      }}
    >
      <Lado nombre={cruce.p1?.nombre ?? null} ganador={cruce.winnerId === cruce.p1?.userId} />
      <div style={{ height: 1, background: "var(--borde)" }} />
      <Lado
        nombre={cruce.esBye ? null : cruce.p2?.nombre ?? null}
        ganador={cruce.winnerId === cruce.p2?.userId}
        bye={cruce.esBye}
      />

      <div style={{ marginTop: "0.15rem" }}>
        {cruce.esBye ? (
          <Etiqueta texto="🎟️ Pasa de ronda" />
        ) : jugado ? (
          <Etiqueta texto="✓ Jugado" color="var(--verde)" />
        ) : abrible && cruce.code ? (
          <a
            href={enlaceJuego(gameUrl, cruce.code)}
            style={{
              display: "inline-block",
              padding: "0.25rem 0.6rem",
              borderRadius: 7,
              background: "var(--acento-fuerte)",
              color: "white",
              fontWeight: 600,
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
        fontSize: "0.85rem",
        fontWeight: ganador ? 700 : 400,
        color: nombre
          ? ganador
            ? "var(--texto)"
            : "var(--texto)"
          : "var(--texto-suave)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: "0.3rem",
      }}
    >
      {ganador && <span aria-hidden>▶</span>}
      {bye ? <em style={{ color: "var(--texto-suave)" }}>(sin rival)</em> : nombre ?? "—"}
    </div>
  );
}

function Etiqueta({ texto, color }: { texto: string; color?: string }) {
  return (
    <span style={{ fontSize: "0.76rem", color: color ?? "var(--texto-suave)" }}>
      {texto}
    </span>
  );
}
