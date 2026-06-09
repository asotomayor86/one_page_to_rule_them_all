import Link from "next/link";
import { getAllGames } from "@/db/queries/games";
import { listarPerfiles } from "@/db/queries/admin";
import { headToHead, historial, ranking } from "@/db/queries/stats";
import { RankingTable } from "@/components/ranking-table";
import { HistorialLista } from "@/components/historial-lista";
import { Card, SeccionTitulo, estiloCampo } from "@/components/ui";

export const dynamic = "force-dynamic";

type Params = { juego?: string; a?: string; b?: string };

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const gameId = sp.juego || undefined;

  const [juegos, perfiles, filas, ultimas] = await Promise.all([
    getAllGames(),
    listarPerfiles(),
    ranking(gameId),
    historial(15),
  ]);

  const juegoActual = juegos.find((j) => j.id === gameId);
  const nombrePerfil = (id?: string) =>
    perfiles.find((p) => p.id === id)?.nickname ||
    perfiles.find((p) => p.id === id)?.displayName ||
    "?";

  // Head-to-head: requiere juego + dos jugadores distintos.
  const h2h =
    gameId && sp.a && sp.b && sp.a !== sp.b
      ? await headToHead(gameId, sp.a, sp.b)
      : null;

  const tabStyle = (activo: boolean) => ({
    padding: "0.35rem 0.7rem",
    borderRadius: 999,
    fontSize: "0.85rem",
    whiteSpace: "nowrap" as const,
    border: "1px solid var(--borde)",
    background: activo ? "var(--acento-fuerte)" : "transparent",
    color: activo ? "white" : "var(--texto-suave)",
  });

  return (
    <>
      <SeccionTitulo>🏆 Ranking</SeccionTitulo>

      {/* Selector de ámbito: global o por juego */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
        }}
      >
        <Link href="/estadisticas" style={tabStyle(!gameId)}>
          🌍 Global
        </Link>
        {juegos.map((j) => (
          <Link
            key={j.id}
            href={`/estadisticas?juego=${j.id}`}
            style={tabStyle(gameId === j.id)}
          >
            {(j.icon || "🎮") + " " + j.name}
          </Link>
        ))}
      </div>

      <Card>
        <p
          style={{
            margin: "0 0 0.75rem",
            color: "var(--texto-suave)",
            fontSize: "0.85rem",
          }}
        >
          {juegoActual
            ? `Ranking de ${juegoActual.name}`
            : "Ranking global (todos los juegos)"}{" "}
          · solo partidas oficiales. Toca las cabeceras para ordenar.
        </p>
        <RankingTable filas={filas} />
      </Card>

      {/* Enfrentamiento directo */}
      <SeccionTitulo>⚔️ Cara a cara</SeccionTitulo>
      <Card>
        <form
          method="get"
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
        >
          <select
            name="juego"
            defaultValue={gameId ?? ""}
            required
            style={{ ...estiloCampo, flex: "1 1 140px" }}
          >
            <option value="" disabled>
              Juego…
            </option>
            {juegos.map((j) => (
              <option key={j.id} value={j.id}>
                {(j.icon || "🎮") + " " + j.name}
              </option>
            ))}
          </select>
          <select
            name="a"
            defaultValue={sp.a ?? ""}
            required
            style={{ ...estiloCampo, flex: "1 1 110px" }}
          >
            <option value="" disabled>
              Jugador 1…
            </option>
            {perfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname || p.displayName}
              </option>
            ))}
          </select>
          <select
            name="b"
            defaultValue={sp.b ?? ""}
            required
            style={{ ...estiloCampo, flex: "1 1 110px" }}
          >
            <option value="" disabled>
              Jugador 2…
            </option>
            {perfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname || p.displayName}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "none",
              background: "var(--acento-fuerte)",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Comparar
          </button>
        </form>

        {h2h && (
          <div style={{ marginTop: "1rem" }}>
            {h2h.jugadas === 0 ? (
              <p style={{ color: "var(--texto-suave)" }}>
                Estos dos no se han enfrentado en {juegoActual?.name} (en
                partidas oficiales).
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-around",
                  gap: "0.5rem",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{nombrePerfil(sp.a)}</div>
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: "var(--verde)",
                    }}
                  >
                    {h2h.victoriasA}
                  </div>
                </div>
                <div style={{ color: "var(--texto-suave)" }}>
                  <div style={{ fontSize: "0.8rem" }}>
                    {h2h.jugadas} partidas
                  </div>
                  <div>{h2h.empates} empates</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{nombrePerfil(sp.b)}</div>
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: "var(--verde)",
                    }}
                  >
                    {h2h.victoriasB}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Historial */}
      <SeccionTitulo>🕓 Partidas recientes</SeccionTitulo>
      <HistorialLista partidas={ultimas} />
    </>
  );
}
