# Dílis portal — production image for Google Cloud Run.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runtime deps for the migration job (drizzle-orm + pg only)
FROM node:22-slim AS migrate-deps
WORKDIR /m
RUN npm init -y >/dev/null && npm i --no-audit --no-fund drizzle-orm@0.45 pg@8

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app

# Next.js standalone server
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# Migrations: run with `node scripts/migrate.mjs` (Cloud Run Job)
COPY --from=build --chown=app:app /app/drizzle ./drizzle
COPY --from=build --chown=app:app /app/scripts/migrate.mjs ./scripts/migrate.mjs
# ESM resolves from the script's own folder upward, so this takes precedence for the job
COPY --from=migrate-deps /m/node_modules ./scripts/node_modules

USER app
EXPOSE 8080
CMD ["node", "server.js"]
