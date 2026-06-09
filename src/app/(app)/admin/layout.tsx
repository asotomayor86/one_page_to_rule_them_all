import type { ReactNode } from "react";
import { requireAdmin } from "@/auth/helpers";

// Toda la sección /admin exige rol de administrador.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
