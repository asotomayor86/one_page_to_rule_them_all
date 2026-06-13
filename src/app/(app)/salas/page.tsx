import { requireUser } from "@/auth/helpers";
import { getGamesForUser } from "@/db/queries/games";
import { getLeaguesForUser, getRoomsForUser } from "@/db/queries/rooms";
import { listarPerfiles } from "@/db/queries/admin";
import { CreateRoomForm } from "@/components/create-room-form";
import { CreateLeagueForm } from "@/components/create-league-form";
import { RoomCard } from "@/components/room-card";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SalasPage() {
  const { profile } = await requireUser();
  const [juegos, perfiles, salas, ligas] = await Promise.all([
    getGamesForUser(profile.id),
    listarPerfiles(),
    getRoomsForUser(profile.id),
    getLeaguesForUser(profile.id),
  ]);

  const juegosCre = juegos.map((j) => ({
    id: j.id,
    name: j.name,
    icon: j.icon,
    url: j.url,
    maxPlayers: j.maxPlayers,
  }));
  const perfilesCre = perfiles.map((p) => ({
    id: p.id,
    nombre: p.nickname || p.displayName,
  }));

  return (
    <>
      <SeccionTitulo>Crear salas y ligas</SeccionTitulo>
      <div
        style={{
          display: "grid",
          gap: "0.9rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        }}
      >
        {/* Crear sala (50%) */}
        <Card>
          <h3 className="seccion-titulo" style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>
            Crear sala
          </h3>
          <CreateRoomForm
            juegos={juegosCre}
            perfiles={perfilesCre}
            currentUserId={profile.id}
          />
        </Card>

        {/* Crear liga (50%) */}
        <Card>
          <h3 className="seccion-titulo" style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>
            Crear liga
          </h3>
          <p
            style={{
              margin: "0 0 0.7rem",
              color: "var(--texto-suave)",
              fontSize: "0.85rem",
            }}
          >
            Todos contra todos. Elige nombre, vueltas y jugadores: se genera una
            sala por cada partido.
          </p>
          <CreateLeagueForm
            juegos={juegosCre.map((j) => ({ id: j.id, name: j.name, icon: j.icon }))}
            perfiles={perfilesCre}
            currentUserId={profile.id}
          />
        </Card>
      </div>

      <SeccionTitulo>Salas independientes</SeccionTitulo>
      {salas.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            No hay salas independientes abiertas. Crea una arriba.
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: "0.9rem" }}>
          {salas.map((s) => (
            <RoomCard key={s.id} sala={s} currentUserId={profile.id} allowClose />
          ))}
        </div>
      )}

      {/* Ligas con sus partidos */}
      {ligas.map((liga) => (
        <section key={liga.id}>
          <SeccionTitulo
            extra={
              <span style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>
                {(liga.game.icon || "🎮") + " " + liga.game.name} ·{" "}
                {liga.rounds} vuelta{liga.rounds > 1 ? "s" : ""} ·{" "}
                {liga.salas.length} partidos
              </span>
            }
          >
            🏆 {liga.name}
          </SeccionTitulo>
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
                gap: "0.7rem",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}
            >
              {liga.salas.map((s) => (
                <RoomCard
                  key={s.id}
                  sala={s}
                  currentUserId={profile.id}
                  mostrarJuego={false}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
