import type { Metadata } from "next";
import { Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

// Tipografía condensada (estética Assemble).
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hub de Juegos en Familia",
  description:
    "Puerta de entrada a los juegos de la familia: acceso, permisos y estadísticas.",
  // Bandera para que iOS muestre la app en modo standalone al añadir al inicio
  // (sin la barra de Safari). Equivale a la meta tag clásica:
  // <meta name="apple-mobile-web-app-capable" content="yes">.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GameHub",
  },
  // Vincula manifest.ts (Next.js lo genera automáticamente en /manifest.webmanifest).
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#1b1f2a",
  // Que el contenido pueda ir hasta los bordes (notch / pantalla completa).
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={barlow.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
