import Link from "next/link";
import { requireUser } from "@/auth/helpers";
import { ProfileForm } from "@/components/profile-form";
import { Card, SeccionTitulo } from "@/components/ui";

export default async function PerfilPage() {
  const { user, profile } = await requireUser();

  return (
    <>
      <SeccionTitulo>Mi perfil</SeccionTitulo>
      <Card style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ margin: 0, color: "var(--texto-suave)", fontSize: "0.9rem" }}>
          Email: <strong style={{ color: "var(--texto)" }}>{user.email}</strong>
        </p>
        <ProfileForm
          displayName={profile.displayName}
          nickname={profile.nickname}
        />
      </Card>

      <SeccionTitulo>Seguridad</SeccionTitulo>
      <Card>
        <p style={{ margin: "0 0 0.75rem", color: "var(--texto-suave)" }}>
          ¿Quieres cambiar tu contraseña?
        </p>
        <Link
          href="/cambiar-password"
          style={{
            display: "inline-block",
            padding: "0.5rem 0.9rem",
            borderRadius: 8,
            border: "1px solid var(--borde)",
          }}
        >
          Cambiar contraseña
        </Link>
      </Card>
    </>
  );
}
