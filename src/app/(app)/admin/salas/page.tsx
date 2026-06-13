import { requireAdmin } from "@/auth/helpers";
import {
  getAllLeaguesAdmin,
  getAllIndependentRoomsAdmin,
} from "@/db/queries/rooms";
import {
  cerrarLigaAdmin,
  cerrarSalaAdmin,
  eliminarLigaAdmin,
} from "@/actions/rooms";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

const botonPeligro: React.CSSProperties = {
  padding: "0.35rem 0.7rem",
  borderRadius: 8,
  border: "1px solid var(--borde)",
  background: "transparent",
  color: "var(--texto)",
  fontSize: "0.82rem",
  cursor: "pointer",
};

export default async function AdminSalasPage() {
  await requireAdmin();
  const [ligas, salas] = await Promise.all([
    getAllLeaguesAdmin(),
    getAllIndependentRoomsAdmin(),
  ]);

  return (
    <>
      <SeccionTitulo>Ligas</SeccionTitulo>
      {ligas.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            No hay ligas creadas.
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {ligas.map((l) => (
            <Card key={l.id}>
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{l.name}</div>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.82rem",
                      color: "var(--texto-suave)",
                    }}
                  >
                    {(l.gameIcon || "🎮") + " " + l.gameName} ·{" "}
                    {l.abiertas}/{l.totalSalas} partidos abiertos
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {l.abiertas > 0 && (
                    <form action={cerrarLigaAdmin}>
                      <input type="hidden" name="leagueId" value={l.id} />
                      <button type="submit" style={botonPeligro}>
                        Cerrar partidos
                      </button>
                    </form>
                  )}
                  <form action={eliminarLigaAdmin}>
                    <input type="hidden" name="leagueId" value={l.id} />
                    <button
                      type="submit"
                      style={{
                        ...botonPeligro,
                        borderColor: "var(--peligro, #b9344b)",
                        color: "var(--peligro, #ff7a90)",
                      }}
                    >
                      Eliminar liga
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SeccionTitulo>Salas sueltas abiertas</SeccionTitulo>
      {salas.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            No hay salas independientes abiertas.
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {salas.map((s) => (
            <Card key={s.id}>
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>
                    <code>{s.code}</code>
                  </div>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.82rem",
                      color: "var(--texto-suave)",
                    }}
                  >
                    {(s.game.icon || "🎮") + " " + s.game.name} ·{" "}
                    {s.jugadores.length} jugador
                    {s.jugadores.length === 1 ? "" : "es"}
                  </p>
                </div>
                <form action={cerrarSalaAdmin}>
                  <input type="hidden" name="roomId" value={s.id} />
                  <button type="submit" style={botonPeligro}>
                    Cerrar sala
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
