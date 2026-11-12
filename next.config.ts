import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Cloud Run container (see Dockerfile).
  output: "standalone",
  serverExternalPackages: ["pg"],
};

export default nextConfig;
