"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/auth/client";

type Props = {
  displayName: string;
  isAdmin: boolean;
};

const enlaces = [
  { href: "/hub", label: "Hub" },
  { href: "/salas", label: "Salas" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/perfil", label: "Perfil" },
];

/** Barra de navegación del área privada (mobile-first). */
export function Nav({ displayName, isAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function cerrarSesion() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const items = isAdmin
    ? [...enlaces, { href: "/admin", label: "Admin" }]
    : enlaces;

  return (
    <header
      style={{
        borderBottom: "1px solid var(--borde)",
        background: "var(--superficie)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        backdropFilter: "blur(14px) saturate(140%)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <nav
        className="contenedor"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <Link href="/hub" style={{ fontWeight: 700 }}>
          🎲 Hub
        </Link>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flex: 1,
            flexWrap: "wrap",
          }}
        >
          {items.map((e) => {
            const activo =
              pathname === e.href || pathname.startsWith(e.href + "/");
            return (
              <Link
                key={e.href}
                href={e.href}
                style={{
                  padding: "0.35rem 0.7rem",
                  borderRadius: 8,
                  fontSize: "0.9rem",
                  background: activo ? "var(--superficie-2)" : "transparent",
                  color: activo ? "var(--texto)" : "var(--texto-suave)",
                }}
              >
                {e.label}
              </Link>
            );
          })}
        </div>
        <span
          style={{
            fontSize: "0.85rem",
            color: "var(--texto-suave)",
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName}
        </span>
        <button
          type="button"
          onClick={cerrarSesion}
          style={{
            border: "1px solid var(--borde)",
            background: "transparent",
            color: "var(--texto-suave)",
            borderRadius: 8,
            padding: "0.35rem 0.7rem",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Salir
        </button>
      </nav>
    </header>
  );
}
