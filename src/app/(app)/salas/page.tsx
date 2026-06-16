import { requireUser } from "@/auth/helpers";
import { getGamesForUser } from "@/db/queries/games";
import { getRoomsForUser } from "@/db/queries/rooms";
import { listarPerfiles } from "@/db/queries/admin";
import { CreateRoomForm } from "@/components/create-room-form";
import { RoomCard } from "@/components/room-card";
import { LeagueSection } from "@/components/league-section";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SalasPage() {
  const { profile } = await requireUser();
  const [juegos, perfiles, salas] = await Promise.all([
    getGamesForUser(profile.id),
    listarPerfiles(),
    getRoomsForUser(profile.id),
  ]);

  return (
    <>
      <LeagueSection name="Crear sala" icon="➕">
        <Card>
          <p
            style={{
              margin: "0 0 0.9rem",
              color: "var(--texto-suave)",
              fontSize: "0.9rem",
            }}
          >
            Elige un juego y los jugadores. Obtendrás un código que se introduce
            en el juego para ocupar el sitio.
          </p>
          <CreateRoomForm
            juegos={juegos.map((j) => ({
              id: j.id,
              name: j.name,
              icon: j.icon,
              url: j.url,
              maxPlayers: j.maxPlayers,
            }))}
            perfiles={perfiles.map((p) => ({
              id: p.id,
              nombre: p.nickname || p.displayName,
            }))}
            currentUserId={profile.id}
          />
        </Card>
      </LeagueSection>

      <SeccionTitulo>Salas abiertas</SeccionTitulo>
      {salas.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            No hay salas abiertas. Crea una arriba. (Las ligas están en su propia
            sección.)
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
          {salas.map((s) => (
            <RoomCard key={s.id} sala={s} currentUserId={profile.id} allowClose />
          ))}
        </div>
      )}
    </>
  );
}
