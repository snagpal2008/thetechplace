// Bindings available on the Worker. Regenerate with `npm run cf-typegen`.
interface CloudflareEnv {
  ASSETS: { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> };
  DB: import("drizzle-orm/d1").AnyD1Database;
  APP_URL: string;
  PLATFORM_NAME: string;
  AUTH_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}
