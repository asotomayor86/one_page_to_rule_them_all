import { ImageResponse } from "next/og";

// Apple touch icon (sin esquinas redondeadas: iOS las añade automáticamente).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 110,
          fontWeight: 900,
          letterSpacing: -3,
        }}
      >
        G
      </div>
    ),
    size,
  );
}
