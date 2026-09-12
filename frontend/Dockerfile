# ---------- builder ----------
# Everything here is thrown away: source, node_modules, the compiler.
FROM node:22-alpine AS builder
WORKDIR /app

# Copied before the source so `npm ci` stays cached until the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* is compiled into the browser bundle, so it must exist at BUILD
# time -- setting it at runtime has no effect. It also has to be a URL the
# *browser* can reach, not a compose service name.
ARG NEXT_PUBLIC_API_URL

RUN npm run build

# ---------- runtime ----------
# Only the compiled output ships. next.config.ts sets output: "standalone",
# which bundles the imported code, so no node_modules copy is needed.
FROM node:22-alpine
WORKDIR /app

RUN adduser -S nextjs

COPY --from=builder --chown=nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs /app/.next/static ./.next/static

USER nextjs

# server.js already defaults to HOSTNAME 0.0.0.0 and PORT 3000.
CMD ["node", "server.js"]
