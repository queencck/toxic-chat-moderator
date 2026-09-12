import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emits a self-contained server bundle in .next/standalone, so the Docker
  // image can skip node_modules entirely.
  output: "standalone",
};

export default nextConfig;
