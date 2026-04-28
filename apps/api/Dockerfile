FROM node:24-slim AS builder

WORKDIR /app

COPY package-lock.json package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --workspace @frameforge/shared --workspace @frameforge/api

COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./

RUN npm run --workspace @frameforge/shared build && npm run --workspace @frameforge/api build

FROM node:24-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

RUN groupadd -r frameforge && useradd -r -g frameforge frameforge

COPY package-lock.json package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --omit=dev --ignore-scripts --workspace @frameforge/shared --workspace @frameforge/api

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

USER frameforge

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]