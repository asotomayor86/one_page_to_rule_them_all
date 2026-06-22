import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
import { InstallBanner } from "@/components/install-banner";
import { AppBadge } from "@/components/app-badge";
import { requireUser } from "@/auth/helpers";
import { contarSalasPendientes } from "@/db/queries/rooms";

// Render dinámico: todo el área privada lee la sesión.
export const dynamic = "force-dynamic";

/** Layout del área privada: exige sesión y pinta la navegación. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUser();
  const pendientes = await contarSalasPendientes(profile.id);

  return (
    <>
      <AppBadge count={pendientes} />
      <InstallBanner />
      <Nav
        displayName={profile.nickname || profile.displayName}
        isAdmin={profile.isAdmin}
        pendientes={pendientes}
      />
      <main className="contenedor" style={{ paddingBottom: "3rem" }}>
        {children}
      </main>
    </>
  );
}
