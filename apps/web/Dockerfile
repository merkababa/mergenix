# ─── Mergenix Web — Multi-stage Dockerfile ────────────────────────────────
# Built from the monorepo root context (docker-compose sets context: .)
# Uses pnpm workspaces for dependency resolution.

# ── Base ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
RUN apk add --no-cache libc6-compat

# ── Dependencies ──────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/genetics-engine/package.json ./packages/genetics-engine/
COPY packages/genetics-data/package.json ./packages/genetics-data/
RUN pnpm install --frozen-lockfile
RUN mkdir -p packages/shared-types/node_modules packages/genetics-engine/node_modules packages/genetics-data/node_modules

# ── Builder ───────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/genetics-engine/node_modules ./packages/genetics-engine/node_modules
COPY --from=deps /app/packages/genetics-data/node_modules ./packages/genetics-data/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @mergenix/web build

# ── Runner ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output (preserves monorepo structure)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://localhost:3000 || exit 1

CMD ["node", "apps/web/server.js"]
