import { getAllGames } from "@/db/queries/games";
import { GameForm } from "@/components/game-form";
import { GameAdminRow } from "@/components/game-admin-row";
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
      <div style={{ display: "grid", gap: "0.45rem" }}>
        {juegos.map((j) => (
          <GameAdminRow key={j.id} juego={j} />
        ))}
      </div>
    </>
  );
}
