# syntax=docker/dockerfile:1
#
# Imagen de producción de next-ruteando (Next.js standalone). El contexto es la RAÍZ del repositorio, porque el pnpm-lock.yaml es único
# para todo el workspace:
#
#   docker build -f next-ruteando/Dockerfile -t ruteando-next .
#   docker run --rm -p 3000:3000 -v ruteando-data:/data --env-file next-ruteando/.env.local ruteando-next
#
# Variables (ver next-ruteando/.env.example y README.md, «Despliegue»): SESSION_SECRET es OBLIGATORIA (el contenedor sale con código 1
# sin ella), además de GATEWAY_URL y GATEWAY_API_KEY (o GATEWAY_MODE=mock, que levanta el gateway simulado dentro del contenedor y pide
# MOCK_GATEWAY_PASSWORD). Las bases SQLite del 2FA y del SSO viven en /data: sin un volumen persistente se pierden al reiniciar.

ARG NODE_VERSION=26

# ---------- base: Node y pnpm (Node 25+ ya no trae Corepack; la versión de pnpm sale de `packageManager`) ----------
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /repo
COPY package.json ./
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]")"

# ---------- deps: solo lo que next-ruteando necesita, con el lockfile congelado ----------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY next-ruteando/package.json next-ruteando/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter next-ruteando...

# ---------- build ----------
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY next-ruteando next-ruteando
RUN pnpm --filter next-ruteando run build

# ---------- runtime: sin pnpm, sin código fuente, sin dependencias de desarrollo y sin root ----------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MFA_DB_PATH=/data/mfa.sqlite \
    SSO_DB_PATH=/data/sso.sqlite
WORKDIR /app
# El standalone trae su propio node_modules mínimo; en un monorepo cuelga de `next-ruteando/`
COPY --from=build --chown=node:node /repo/next-ruteando/.next/standalone ./
COPY --from=build --chown=node:node /repo/next-ruteando/.next/static ./next-ruteando/.next/static
# Lanzador y gateway simulado (solo se usa con GATEWAY_MODE=mock; el gateway lee este fixture de los dominios maestros)
COPY --chown=node:node scripts/start.mjs scripts/mock-gateway.mjs ./scripts/
COPY --chown=node:node next-ruteando/test/fixtures/gateway/get__master-domains.json ./next-ruteando/test/fixtures/gateway/get__master-domains.json
RUN mkdir /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthCheck').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "scripts/start.mjs", "next-ruteando/server.js"]
