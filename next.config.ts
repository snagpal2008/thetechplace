import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only used by Node-side scripts/tests (SQLITE_URL); never loaded on Workers.
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;

// `next dev` gets real Cloudflare bindings (local D1) from wrangler.jsonc.
if (process.env.NODE_ENV === "development") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
