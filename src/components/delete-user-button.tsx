"use client";

import { eliminarUsuario } from "@/actions/admin";

/** Botón para eliminar una cuenta, con confirmación previa. */
export function DeleteUserButton({
  userId,
  nombre,
}: {
  userId: string;
  nombre: string;
}) {
  return (
    <form
      action={eliminarUsuario}
      onSubmit={(e) => {
        if (
          !confirm(
            `¿Eliminar a ${nombre}? Se borrará su cuenta y sus estadísticas. Esta acción no se puede deshacer.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        title="Eliminar cuenta"
        style={{
          fontSize: "0.8rem",
          padding: "0.3rem 0.6rem",
          borderRadius: 999,
          cursor: "pointer",
          border: "1px solid var(--rojo)",
          background: "transparent",
          color: "var(--rojo)",
        }}
      >
        Eliminar
      </button>
    </form>
  );
}
