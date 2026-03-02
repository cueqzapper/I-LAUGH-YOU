# ── Stage 1: Dependencies ─────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@9.15.3 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@9.15.3 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pre-create SQLite DB with WAL mode so parallel build workers don't race on init
RUN mkdir -p /app/data && \
    node -e "const D=require('better-sqlite3');const d=new D('/app/data/ily.sqlite',{timeout:10000});d.pragma('journal_mode=WAL');d.pragma('busy_timeout=10000');d.close()"

# Build args for NEXT_PUBLIC_ env vars (baked into client bundle)
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN pnpm build

# ── Stage 3: Production runner ────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Next.js image cache directory (writable)
RUN mkdir -p /app/.next/cache && chown nextjs:nodejs /app/.next/cache

# SQLite data directory — mount a volume here
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
