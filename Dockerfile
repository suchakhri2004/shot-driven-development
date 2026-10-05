# One image: the game server, which also serves the built web app on the same port.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/engine/package.json packages/engine/
COPY packages/cards/package.json packages/cards/
COPY packages/protocol/package.json packages/protocol/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages packages
COPY apps apps
RUN npm run build:web

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/engine/package.json packages/engine/
COPY packages/cards/package.json packages/cards/
COPY packages/protocol/package.json packages/protocol/
RUN npm ci --omit=dev --workspace @sdd/server --include-workspace-root
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/server apps/server
COPY --from=build /app/apps/web/.output/public apps/web/.output/public

ENV NODE_ENV=production PORT=3210
EXPOSE 3210
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://localhost:${PORT}/health" || exit 1
CMD ["npx", "tsx", "apps/server/src/index.ts"]
