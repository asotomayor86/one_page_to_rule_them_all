import { alternarAdmin, alternarPermiso } from "@/actions/admin";
import { getCurrentUser } from "@/auth/helpers";
import { listarUsuarios } from "@/db/queries/admin";
import { getAllGames } from "@/db/queries/games";
import { InviteForm } from "@/components/invite-form";
import { DeleteUserButton } from "@/components/delete-user-button";
import { Aviso, Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const [{ usuarios, error }, juegos, actual] = await Promise.all([
    listarUsuarios(),
    getAllGames(),
    getCurrentUser(),
  ]);

  return (
    <>
      <SeccionTitulo>Invitar a alguien</SeccionTitulo>
      <Card>
        <InviteForm />
      </Card>

      <SeccionTitulo>Usuarios ({usuarios.length})</SeccionTitulo>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {usuarios.map((u) => (
          <Card
            key={u.id}
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
              <div>
                <strong>{u.name}</strong>
                {u.nickname && (
                  <span style={{ color: "var(--texto-suave)" }}> ({u.nickname})</span>
                )}
                <div style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>
                  {u.email}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <form action={alternarAdmin}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input
                    type="hidden"
                    name="hacerAdmin"
                    value={(!u.isAdmin).toString()}
                  />
                  <button
                    type="submit"
                    style={{
                      fontSize: "0.8rem",
                      padding: "0.3rem 0.6rem",
                      borderRadius: 999,
                      cursor: "pointer",
                      border: "1px solid var(--borde)",
                      background: u.isAdmin ? "var(--oro)" : "transparent",
                      color: u.isAdmin ? "#1a1300" : "var(--texto-suave)",
                      fontWeight: 600,
                    }}
                  >
                    {u.isAdmin ? "★ Admin" : "Hacer admin"}
                  </button>
                </form>
                {/* No se puede eliminar la propia cuenta. */}
                {actual?.id !== u.id && (
                  <DeleteUserButton userId={u.id} nombre={u.name} />
                )}
              </div>
            </div>

            {/* Permisos por juego */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {juegos.length === 0 && (
                <span style={{ color: "var(--texto-suave)", fontSize: "0.85rem" }}>
                  No hay juegos todavía.
                </span>
              )}
              {juegos.map((j) => {
                const tieneAcceso = u.gameIds.includes(j.id);
                return (
                  <form key={j.id} action={alternarPermiso}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="gameId" value={j.id} />
                    <input
                      type="hidden"
                      name="conceder"
                      value={(!tieneAcceso).toString()}
                    />
                    <button
                      type="submit"
                      title={tieneAcceso ? "Quitar acceso" : "Dar acceso"}
                      style={{
                        fontSize: "0.8rem",
                        padding: "0.3rem 0.6rem",
                        borderRadius: 999,
                        cursor: "pointer",
                        border: "1px solid var(--borde)",
                        background: tieneAcceso
                          ? "var(--verde)"
                          : "transparent",
                        color: tieneAcceso ? "#04231a" : "var(--texto-suave)",
                      }}
                    >
                      {tieneAcceso ? "✓ " : "+ "}
                      {j.icon || "🎮"} {j.name}
                    </button>
                  </form>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
