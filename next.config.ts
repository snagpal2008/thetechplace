import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg is resolved at runtime (Node locally, nodejs_compat on Workers)
  serverExternalPackages: ["pg"],
};

export default nextConfig;

// Lets `next dev` read Cloudflare bindings (e.g. HYPERDRIVE) from wrangler.jsonc.
// Only active when running locally; ignored in production builds.
if (process.env.NODE_ENV === "development" && process.env.CF_DEV_BINDINGS === "1") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
