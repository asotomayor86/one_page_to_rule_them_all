import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
import { requireUser } from "@/auth/helpers";

// Render dinámico: todo el área privada lee la sesión.
export const dynamic = "force-dynamic";

/** Layout del área privada: exige sesión y pinta la navegación. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUser();

  return (
    <>
      <Nav
        displayName={profile.nickname || profile.displayName}
        isAdmin={profile.isAdmin}
      />
      <main className="contenedor" style={{ paddingBottom: "3rem" }}>
        {children}
      </main>
    </>
  );
}
