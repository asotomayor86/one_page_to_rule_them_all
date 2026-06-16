import { requireUser } from "@/auth/helpers";
import { getGamesForUser } from "@/db/queries/games";
import { getLeaguesForUser } from "@/db/queries/rooms";
import { listarPerfiles } from "@/db/queries/admin";
import { CreateLeagueForm } from "@/components/create-league-form";
import { RoomCard } from "@/components/room-card";
import { ClasificacionTable } from "@/components/clasificacion-table";
import { LeagueSection } from "@/components/league-section";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LigasPage() {
  const { profile } = await requireUser();
  const [juegos, perfiles, ligas] = await Promise.all([
    getGamesForUser(profile.id),
    listarPerfiles(),
    getLeaguesForUser(profile.id),
  ]);

  const juegosCre = juegos.map((j) => ({
    id: j.id,
    name: j.name,
    icon: j.icon,
  }));
  const perfilesCre = perfiles.map((p) => ({
    id: p.id,
    nombre: p.nickname || p.displayName,
  }));

  return (
    <>
      <LeagueSection name="Crear liga" icon="➕">
        <Card>
          <p
            style={{
              margin: "0 0 0.7rem",
              color: "var(--texto-suave)",
              fontSize: "0.9rem",
            }}
          >
            Todos contra todos. Elige nombre, vueltas y jugadores: se genera una
            sala por cada partido. Los resultados cuentan en Estadísticas.
          </p>
          <CreateLeagueForm
            juegos={juegosCre}
            perfiles={perfilesCre}
            currentUserId={profile.id}
          />
        </Card>
      </LeagueSection>

      <SeccionTitulo>Ligas</SeccionTitulo>
      {ligas.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            Todavía no hay ligas. Crea una arriba.
          </p>
        </Card>
      ) : (
        ligas.map((liga) => (
          <LeagueSection
            key={liga.id}
            name={liga.name}
            subtitle={`${liga.game.icon || "🎮"} ${liga.game.name} · ${liga.rounds} vuelta${liga.rounds > 1 ? "s" : ""} · ${liga.salas.length} partidos`}
          >
            <ClasificacionTable filas={liga.clasificacion} />
            <h3
              className="seccion-titulo"
              style={{
                margin: "0.4rem 0 0",
                fontSize: "0.9rem",
                color: "var(--texto-suave)",
              }}
            >
              Partidos
            </h3>
            {liga.salas.length === 0 ? (
              <Card>
                <p style={{ margin: 0, color: "var(--texto-suave)" }}>
                  Esta liga no tiene partidos.
                </p>
              </Card>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "0.6rem",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                }}
              >
                {liga.salas.map((s) => (
                  <RoomCard key={s.id} sala={s} currentUserId={profile.id} />
                ))}
              </div>
            )}
          </LeagueSection>
        ))
      )}
    </>
  );
}
