import { getAllGames } from "@/db/queries/games";
import { GameForm } from "@/components/game-form";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JuegosPage() {
  const juegos = await getAllGames();

  return (
    <>
      <SeccionTitulo>Nuevo juego</SeccionTitulo>
      <Card>
        <GameForm />
      </Card>

      <SeccionTitulo>Juegos ({juegos.length})</SeccionTitulo>
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {juegos.map((j) => (
          <Card key={j.id}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.6rem",
              }}
            >
              <span style={{ fontSize: "1.4rem" }}>{j.icon || "🎮"}</span>
              <strong>{j.name}</strong>
              {!j.active && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--texto-suave)",
                    border: "1px solid var(--borde)",
                    borderRadius: 6,
                    padding: "0 0.4rem",
                  }}
                >
                  inactivo
                </span>
              )}
            </div>
            <GameForm juego={j} />
          </Card>
        ))}
      </div>
    </>
  );
}
