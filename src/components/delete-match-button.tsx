"use client";

import { eliminarPartida } from "@/actions/admin";

/** Botón para eliminar una partida del historial (y del ranking), con confirmación. */
export function DeleteMatchButton({
  matchId,
  resumen,
}: {
  matchId: string;
  resumen: string;
}) {
  return (
    <form
      action={eliminarPartida}
      onSubmit={(e) => {
        if (
          !confirm(
            `¿Eliminar esta partida?\n\n${resumen}\n\nSe borrará del historial y dejará de contar para el ranking.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="matchId" value={matchId} />
      <button
        type="submit"
        title="Eliminar partida (afecta al ranking)"
        aria-label="Eliminar partida"
        style={{
          padding: "0.2rem 0.45rem",
          borderRadius: 6,
          border: "1px solid var(--borde)",
          background: "transparent",
          color: "var(--texto-suave)",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}
      >
        ✕
      </button>
    </form>
  );
}
