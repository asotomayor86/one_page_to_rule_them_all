import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { getGamesForUser } from "@/db/queries/games";
import { getRoomsForUser, getLeaguesForUser } from "@/db/queries/rooms";
import { Card, SeccionTitulo } from "@/components/ui";
import { RoomCard } from "@/components/room-card";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const { profile } = await requireUser();
  const [juegos, salas, ligas] = await Promise.all([
    getGamesForUser(profile.id),
    getRoomsForUser(profile.id),
    getLeaguesForUser(profile.id),
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

  const totalPendientes = salas.length + partidosLiga.length;

  return (
    <>
      <SeccionTitulo>
        Hola, {profile.nickname || profile.displayName} 👋
      </SeccionTitulo>

      {juegos.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            Todavía no tienes ningún juego asignado. Pide a un administrador de
            la familia que te dé acceso.
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
            que invitarte desde <Link href="/salas">Salas</Link> o desde una{" "}
            <Link href="/ligas">Liga</Link>.
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
        </>
      )}
    </>
  );
}
