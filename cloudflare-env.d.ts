// Bindings available on the Worker. Regenerate with `npm run cf-typegen`.
interface CloudflareEnv {
  ASSETS: Fetcher;
  HYPERDRIVE: { connectionString: string };
  APP_URL: string;
  PLATFORM_NAME: string;
  AUTH_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}
interface Fetcher { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> }
