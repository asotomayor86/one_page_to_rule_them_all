import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { getGamesForUser } from "@/db/queries/games";
import {
  getRoomsForUser,
  getLeaguesForUser,
  type Sala,
} from "@/db/queries/rooms";
import { getTournamentsForUser } from "@/db/queries/tournaments";
import { Card, SeccionTitulo } from "@/components/ui";
import { RoomCard } from "@/components/room-card";
import { LeagueSection } from "@/components/league-section";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const { profile } = await requireUser();
  const [juegos, salas, ligas, torneos] = await Promise.all([
    getGamesForUser(profile.id),
    getRoomsForUser(profile.id),
    getLeaguesForUser(profile.id),
    getTournamentsForUser(profile.id),
  ]);

  const soyJugador = (s: Sala) =>
    s.status === "open" && s.jugadores.some((j) => j.userId === profile.id);

  // Todas mis partidas pendientes en una sola lista: salas sueltas + partidos de
  // liga + cruces de torneo. Cada sala lleva su leagueId/tournamentId, así la
  // tarjeta se colorea sola según su origen.
  const pendientes: Sala[] = [
    ...salas,
    ...ligas.flatMap((l) => l.salas.filter(soyJugador)),
    ...torneos.flatMap((t) => t.salas.filter(soyJugador)),
  ];

  const totalPendientes = pendientes.length;

  return (
    <>
      <SeccionTitulo>
        Hola, {profile.nickname || profile.displayName} 👋
      </SeccionTitulo>

      {/* 1) Tus invitaciones (plegado por defecto; al desplegar, todas las salas) */}
      {totalPendientes === 0 ? (
        <>
          <SeccionTitulo>Tus invitaciones</SeccionTitulo>
          <Card>
            <p style={{ margin: 0, color: "var(--texto-suave)" }}>
              No tienes salas ni partidos pendientes. Para jugar, alguien tiene
              que invitarte desde <Link href="/salas">Salas</Link>, una{" "}
              <Link href="/ligas">Liga</Link> o un{" "}
              <Link href="/torneos">Torneo</Link>.
            </p>
          </Card>
        </>
      ) : (
        <LeagueSection
          name="Tus invitaciones"
          icon="📨"
          defaultOpen={false}
          subtitle={`${totalPendientes} pendiente${totalPendientes !== 1 ? "s" : ""}`}
        >
          <div
            style={{
              display: "grid",
              gap: "0.6rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            }}
          >
            {pendientes.map((s) => (
              <RoomCard key={s.id} sala={s} currentUserId={profile.id} />
            ))}
          </div>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "var(--texto-suave)" }}>
            <span style={{ color: "#9b8cff" }}>■</span> Sala suelta ·{" "}
            <span style={{ color: "#f5c451" }}>■</span> Liga ·{" "}
            <span style={{ color: "#46c98b" }}>■</span> Torneo
          </p>
        </LeagueSection>
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

      {/* 3) Juegos disponibles (plegado por defecto) */}
      <LeagueSection
        name="Juegos disponibles"
        icon="🎮"
        defaultOpen={false}
        subtitle={`${juegos.length}`}
      >
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
      </LeagueSection>
    </>
  );
}
