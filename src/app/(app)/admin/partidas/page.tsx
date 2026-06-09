import { getAllGames } from "@/db/queries/games";
import { listarPerfiles } from "@/db/queries/admin";
import { historial } from "@/db/queries/stats";
import { MatchForm } from "@/components/match-form";
import { HistorialLista } from "@/components/historial-lista";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PartidasPage() {
  const [juegos, perfiles, ultimas] = await Promise.all([
    getAllGames(),
    listarPerfiles(),
    historial(10),
  ]);

  const juegosActivos = juegos
    .filter((j) => j.active)
    .map((j) => ({ id: j.id, name: j.name, icon: j.icon }));

  return (
    <>
      <SeccionTitulo>Registrar partida</SeccionTitulo>
      <Card>
        {juegosActivos.length === 0 || perfiles.length < 2 ? (
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            Necesitas al menos un juego activo y dos jugadores para registrar una
            partida.
          </p>
        ) : (
          <MatchForm juegos={juegosActivos} perfiles={perfiles} />
        )}
      </Card>

      <SeccionTitulo>Últimas partidas</SeccionTitulo>
      <HistorialLista partidas={ultimas} />
    </>
  );
}
