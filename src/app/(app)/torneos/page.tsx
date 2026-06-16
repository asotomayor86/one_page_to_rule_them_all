import { requireUser } from "@/auth/helpers";
import { getGamesForUser } from "@/db/queries/games";
import { getTournamentsForUser } from "@/db/queries/tournaments";
import { listarPerfiles } from "@/db/queries/admin";
import { CreateTournamentForm } from "@/components/create-tournament-form";
import { TournamentBracket } from "@/components/tournament-bracket";
import { LeagueSection } from "@/components/league-section";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TorneosPage() {
  const { profile } = await requireUser();
  const [juegos, perfiles, torneos] = await Promise.all([
    getGamesForUser(profile.id),
    listarPerfiles(),
    getTournamentsForUser(profile.id),
  ]);

  const juegosCre = juegos.map((j) => ({ id: j.id, name: j.name, icon: j.icon }));
  const perfilesCre = perfiles.map((p) => ({
    id: p.id,
    nombre: p.nickname || p.displayName,
  }));

  return (
    <>
      <SeccionTitulo>Crear torneo</SeccionTitulo>
      <Card>
        <p
          style={{
            margin: "0 0 0.7rem",
            color: "var(--texto-suave)",
            fontSize: "0.9rem",
          }}
        >
          Eliminatorio a un partido. Elige juego, a cuántas victorias se juega cada
          cruce y los jugadores (mínimo 4). El ganador de cada cruce avanza; con
          menos jugadores que el cuadro, algunos pasan de ronda por sorteo.
        </p>
        <CreateTournamentForm
          juegos={juegosCre}
          perfiles={perfilesCre}
          currentUserId={profile.id}
        />
      </Card>

      <SeccionTitulo>Torneos</SeccionTitulo>
      {torneos.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            Todavía no hay torneos. Crea uno arriba.
          </p>
        </Card>
      ) : (
        torneos.map((t) => (
          <LeagueSection
            key={t.id}
            name={t.name}
            subtitle={`${t.game.icon || "🎮"} ${t.game.name} · cuadro de ${t.bracketSize} · al mejor de ${t.winsNeeded}${
              t.champion
                ? ` · 🏆 ${t.champion.nombre}`
                : t.status === "closed"
                  ? " · cerrado"
                  : ""
            }`}
          >
            <TournamentBracket torneo={t} currentUserId={profile.id} />
          </LeagueSection>
        ))
      )}
    </>
  );
}
