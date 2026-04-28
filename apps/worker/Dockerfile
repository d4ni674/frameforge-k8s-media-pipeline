FROM node:24-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package-lock.json package.json ./
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --workspace @frameforge/shared --workspace @frameforge/worker

COPY packages/shared/ ./packages/shared/
COPY apps/worker/ ./apps/worker/
COPY tsconfig.base.json ./

RUN npm run --workspace @frameforge/shared build && npm run --workspace @frameforge/worker build

FROM node:24-slim AS runner

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends libvips42 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN groupadd -r frameforge && useradd -r -g frameforge frameforge

COPY package-lock.json package.json ./
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --omit=dev --ignore-scripts --workspace @frameforge/shared --workspace @frameforge/worker

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

USER frameforge

EXPOSE 9090

CMD ["node", "apps/worker/dist/index.js"]