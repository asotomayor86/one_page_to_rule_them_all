import { requireUser } from "@/auth/helpers";
import { getGamesForUser } from "@/db/queries/games";
import { getRoomsForUser } from "@/db/queries/rooms";
import { listarPerfiles } from "@/db/queries/admin";
import { cerrarSala } from "@/actions/rooms";
import { CreateRoomForm } from "@/components/create-room-form";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

function enlaceJuego(url: string, code: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sala=${code}`;
}

export default async function SalasPage() {
  const { profile } = await requireUser();
  const [juegos, perfiles, salas] = await Promise.all([
    getGamesForUser(profile.id),
    listarPerfiles(),
    getRoomsForUser(profile.id),
  ]);

  return (
    <>
      <SeccionTitulo>Crear sala</SeccionTitulo>
      <Card>
        <p
          style={{
            margin: "0 0 0.9rem",
            color: "var(--texto-suave)",
            fontSize: "0.9rem",
          }}
        >
          Elige un juego y los jugadores. Obtendrás un código que se introduce en
          el juego para ocupar el sitio.
        </p>
        <CreateRoomForm
          juegos={juegos.map((j) => ({
            id: j.id,
            name: j.name,
            icon: j.icon,
            url: j.url,
          }))}
          perfiles={perfiles.map((p) => ({
            id: p.id,
            nombre: p.nickname || p.displayName,
          }))}
          currentUserId={profile.id}
        />
      </Card>

      <SeccionTitulo>Salas abiertas</SeccionTitulo>
      {salas.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            No hay salas abiertas. Crea una arriba.
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: "0.9rem" }}>
          {salas.map((s) => (
            <Card
              key={s.id}
              style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <strong>{(s.game.icon || "🎮") + " " + s.game.name}</strong>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "1.3rem",
                    letterSpacing: "0.15em",
                    background: "var(--superficie-2)",
                    border: "1px solid var(--borde)",
                    borderRadius: 8,
                    padding: "0.1rem 0.6rem",
                  }}
                >
                  {s.code}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.35rem",
                  fontSize: "0.85rem",
                  color: "var(--texto-suave)",
                }}
              >
                {s.jugadores.map((j) => (
                  <span
                    key={j.userId}
                    style={{
                      padding: "0.15rem 0.5rem",
                      borderRadius: 8,
                      background: "var(--superficie-2)",
                    }}
                  >
                    {j.nombre}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <a
                  href={enlaceJuego(s.game.url, s.code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: 8,
                    background: "var(--acento-fuerte)",
                    color: "white",
                    fontWeight: 600,
                  }}
                >
                  Abrir juego →
                </a>
                {s.createdBy === profile.id && (
                  <form action={cerrarSala}>
                    <input type="hidden" name="roomId" value={s.id} />
                    <button
                      type="submit"
                      style={{
                        padding: "0.45rem 0.9rem",
                        borderRadius: 8,
                        border: "1px solid var(--borde)",
                        background: "transparent",
                        color: "var(--texto-suave)",
                        cursor: "pointer",
                      }}
                    >
                      Cerrar sala
                    </button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
