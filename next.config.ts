import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nada especial por ahora. (No marcamos @neondatabase/auth como external:
  // necesita que el bundler resuelva sus imports internos como next/headers.)
};

export default nextConfig;
