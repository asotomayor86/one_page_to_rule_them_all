"use client";

import { useState, type ReactNode } from "react";

/** Sección plegable: cabecera clicable que muestra/oculta el contenido. */
export function LeagueSection({
  name,
  subtitle,
  defaultOpen = false,
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
          padding: "0.55rem 0.8rem",
          borderRadius: 12,
          cursor: "pointer",
          color: "var(--texto)",
          textAlign: "left",
        }}
      >
        <span
          className="seccion-titulo"
          style={{ fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.6rem" }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 9,
              border: `1px solid ${open ? "var(--acento)" : "var(--borde)"}`,
              background: open ? "var(--acento-fuerte)" : "var(--superficie-2)",
              color: open ? "white" : "var(--texto)",
              fontSize: "1.5rem",
              lineHeight: 1,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {open ? "−" : "+"}
          </span>
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
