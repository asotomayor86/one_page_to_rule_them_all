import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { getGamesForUser } from "@/db/queries/games";
import { getRoomsForUser, getLeaguesForUser } from "@/db/queries/rooms";
import { getTournamentsForUser } from "@/db/queries/tournaments";
import { Card, SeccionTitulo } from "@/components/ui";
import { RoomCard } from "@/components/room-card";

export const dynamic = "force-dynamic";

function enlaceJuego(url: string, code: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sala=${code}`;
}

export default async function HubPage() {
  const { profile } = await requireUser();
  const [juegos, salas, ligas, torneos] = await Promise.all([
    getGamesForUser(profile.id),
    getRoomsForUser(profile.id),
    getLeaguesForUser(profile.id),
    getTournamentsForUser(profile.id),
  ]);

  // Partidos pendientes de liga: salas open en ligas donde el usuario juega.
  const partidosLiga = ligas.flatMap((liga) =>
    liga.salas
      .filter(
        (s) =>
          s.status === "open" &&
          s.jugadores.some((j) => j.userId === profile.id),
      )
      .map((sala) => ({ ligaName: liga.name, sala })),
  );

  // Cruces de torneo pendientes: mi cruce con sala abierta y sin ganador aún.
  const partidosTorneo = torneos.flatMap((t) =>
    t.rondas.flatMap((r) =>
      r.cruces
        .filter(
          (c) =>
            c.status === "open" &&
            !c.winnerId &&
            !!c.code &&
            (c.p1?.userId === profile.id || c.p2?.userId === profile.id),
        )
        .map((c) => ({
          torneoName: t.name,
          ronda: r.nombre,
          game: t.game,
          code: c.code as string,
          rival:
            (c.p1?.userId === profile.id ? c.p2?.nombre : c.p1?.nombre) ??
            "rival",
        })),
    ),
  );

  const totalPendientes =
    salas.length + partidosLiga.length + partidosTorneo.length;

  return (
    <>
      <SeccionTitulo>
        Hola, {profile.nickname || profile.displayName} 👋
      </SeccionTitulo>

      {/* 1) Tus invitaciones */}
      <SeccionTitulo>
        Tus invitaciones{" "}
        {totalPendientes > 0 && (
          <span style={{ fontSize: "0.85rem", color: "var(--texto-suave)" }}>
            ({totalPendientes} pendiente{totalPendientes !== 1 ? "s" : ""})
          </span>
        )}
      </SeccionTitulo>

      {totalPendientes === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            No tienes salas ni partidos pendientes. Para jugar, alguien tiene
            que invitarte desde <Link href="/salas">Salas</Link>, una{" "}
            <Link href="/ligas">Liga</Link> o un{" "}
            <Link href="/torneos">Torneo</Link>.
          </p>
        </Card>
      ) : (
        <>
          {salas.length > 0 && (
            <div style={{ display: "grid", gap: "0.6rem", marginBottom: "0.9rem" }}>
              {salas.map((s) => (
                <RoomCard key={s.id} sala={s} currentUserId={profile.id} />
              ))}
            </div>
          )}
          {partidosLiga.length > 0 && (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {partidosLiga.map(({ ligaName, sala }) => (
                <div key={sala.id}>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--texto-suave)",
                      marginBottom: "0.25rem",
                      paddingLeft: "0.1rem",
                    }}
                  >
                    🏆 Liga: {ligaName}
                  </div>
                  <RoomCard sala={sala} currentUserId={profile.id} />
                </div>
              ))}
            </div>
          )}
          {partidosTorneo.length > 0 && (
            <div style={{ display: "grid", gap: "0.6rem", marginTop: "0.9rem" }}>
              {partidosTorneo.map((p) => (
                <Card
                  key={p.code}
                  style={{ display: "flex", flexDirection: "column", gap: "0.4rem", padding: "0.6rem 0.75rem" }}
                >
                  <div style={{ fontSize: "0.78rem", color: "var(--texto-suave)" }}>
                    🏆 Torneo: {p.torneoName} · {p.ronda}
                  </div>
                  <strong style={{ fontSize: "0.95rem" }}>
                    {profile.nickname || profile.displayName} vs {p.rival}
                  </strong>
                  <div style={{ fontSize: "0.78rem", color: "var(--texto-suave)" }}>
                    {(p.game.icon || "🎮") + " " + p.game.name}
                  </div>
                  <a
                    href={enlaceJuego(p.game.url, p.code)}
                    style={{
                      alignSelf: "flex-start",
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
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* 2) Competición familiar */}
      <SeccionTitulo>Competición familiar</SeccionTitulo>
      <Card>
        <p style={{ margin: "0 0 0.75rem", color: "var(--texto-suave)" }}>
          Mira quién va ganando y revisa los enfrentamientos.
        </p>
        <Link
          href="/estadisticas"
          style={{
            display: "inline-block",
            padding: "0.5rem 0.9rem",
            borderRadius: 8,
            background: "var(--superficie-2)",
            border: "1px solid var(--borde)",
          }}
        >
          Ver estadísticas y ranking →
        </Link>
      </Card>

      {/* 3) Juegos disponibles */}
      <SeccionTitulo>Juegos disponibles</SeccionTitulo>
      {juegos.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            Todavía no hay juegos disponibles. Un administrador puede darlos de
            alta desde el panel de administración.
          </p>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          {juegos.map((juego) => (
            <Card
              key={juego.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div style={{ fontSize: "2rem", lineHeight: 1 }}>
                {juego.icon || "🎮"}
              </div>
              <div style={{ fontWeight: 700 }}>{juego.name}</div>
              {juego.description && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "var(--texto-suave)",
                    flex: 1,
                  }}
                >
                  {juego.description}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
