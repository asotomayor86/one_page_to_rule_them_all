import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { getGamesForUser } from "@/db/queries/games";
import { Card, SeccionTitulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const { profile } = await requireUser();
  const juegos = await getGamesForUser(profile.id);

  return (
    <>
      <SeccionTitulo>
        Hola, {profile.nickname || profile.displayName} 👋
      </SeccionTitulo>

      {juegos.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "var(--texto-suave)" }}>
            Todavía no tienes ningún juego asignado. Pide a un administrador de
            la familia que te dé acceso.
          </p>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          {juegos.map((juego) => (
            <Card
              key={juego.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div style={{ fontSize: "2rem", lineHeight: 1 }}>
                {juego.icon || "🎮"}
              </div>
              <div style={{ fontWeight: 700 }}>{juego.name}</div>
              {juego.description && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "var(--texto-suave)",
                    flex: 1,
                  }}
                >
                  {juego.description}
                </p>
              )}
              <a
                href={juego.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textAlign: "center",
                  padding: "0.55rem",
                  borderRadius: 8,
                  background: "var(--acento-fuerte)",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                Jugar →
              </a>
            </Card>
          ))}
        </div>
      )}

      <SeccionTitulo>Competición familiar</SeccionTitulo>
      <Card>
        <p style={{ margin: "0 0 0.75rem", color: "var(--texto-suave)" }}>
          Mira quién va ganando y revisa los enfrentamientos.
        </p>
        <Link
          href="/estadisticas"
          style={{
            display: "inline-block",
            padding: "0.5rem 0.9rem",
            borderRadius: 8,
            background: "var(--superficie-2)",
            border: "1px solid var(--borde)",
          }}
        >
          Ver estadísticas y ranking →
        </Link>
      </Card>
    </>
  );
}
