import Link from "next/link";
import { SeccionTitulo, Card } from "@/components/ui";

const secciones = [
  {
    href: "/admin/usuarios",
    titulo: "👥 Usuarios y permisos",
    desc: "Invitar personas, marcar administradores y dar acceso a juegos.",
  },
  {
    href: "/admin/juegos",
    titulo: "🎮 Juegos",
    desc: "Dar de alta y editar los juegos del catálogo.",
  },
  {
    href: "/admin/partidas",
    titulo: "🏆 Registrar partidas",
    desc: "Anotar resultados de partidas mientras los juegos no escriben solos.",
  },
  {
    href: "/admin/salas",
    titulo: "🚪 Salas y ligas",
    desc: "Cerrar salas abiertas y cerrar o eliminar ligas.",
  },
];

export default function AdminPage() {
  return (
    <>
      <SeccionTitulo>Administración</SeccionTitulo>
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {secciones.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.titulo}</div>
              <p style={{ margin: 0, color: "var(--texto-suave)", fontSize: "0.9rem" }}>
                {s.desc}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
