import { ImageResponse } from "next/og";

// Icono PWA/favicon generado en runtime con next/og. Es un cuadrado azul-marvel
// con la inicial "G" centrada. Vale para la pestaña del navegador y, por la
// declaración del manifest, también como icono al instalar el PWA.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1b1f2a 0%, #e23636 100%)",
          color: "#fff",
          fontSize: 320,
          fontWeight: 900,
          letterSpacing: -8,
        }}
      >
        G
      </div>
    ),
    size,
  );
}
