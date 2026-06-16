"use client";

import { useState, type ReactNode } from "react";

/** Sección plegable: cabecera clicable que muestra/oculta el contenido. */
export function LeagueSection({
  name,
  subtitle,
  defaultOpen = true,
  icon = "🏆",
  children,
}: {
  name: string;
  subtitle?: string;
  defaultOpen?: boolean;
  icon?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section style={{ marginTop: "1rem" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="glass"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          padding: "0.5rem 0.8rem",
          borderRadius: 12,
          cursor: "pointer",
          color: "var(--texto)",
          textAlign: "left",
        }}
      >
        <span
          className="seccion-titulo"
          style={{ fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <span style={{ color: "var(--texto-suave)" }}>{open ? "▾" : "▸"}</span>
          {icon} {name}
        </span>
        {subtitle && (
          <span style={{ fontSize: "0.78rem", color: "var(--texto-suave)" }}>
            {subtitle}
          </span>
        )}
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.6rem" }}>
          {children}
        </div>
      )}
    </section>
  );
}
