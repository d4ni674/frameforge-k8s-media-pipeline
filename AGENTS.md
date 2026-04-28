# AGENTS.md — FrameForge

High-signal guidance for OpenCode sessions working in this repo.

## Monorepo & Workspaces

- Three npm workspaces: `@frameforge/shared`, `@frameforge/api`, `@frameforge/worker`.
- **Shared must be built before apps that depend on it.**
  - `npm run --workspace @frameforge/shared build`
  - Then build the app workspace.
- Root `npm run build` builds all workspaces in dependency order.

## Local Development

1. Start infra: `docker compose up -d` (Postgres, MinIO, RabbitMQ).
2. Copy environment: `cp .env.example .env`.
3. Build shared: `npm run --workspace @frameforge/shared build`.
4. Export env and run:
   - API: `export $(cat .env | xargs) && npm run dev:api`
   - Worker: `export $(cat .env | xargs) && npm run dev:worker`

Dev servers:
- API (`apps/api`): `ts-node-dev --respawn --transpile-only src/main.ts` → port 3000.
- Worker (`apps/worker`): `tsx src/index.ts` → metrics on port 9090.

## Build & TypeScript

- `tsconfig.base.json` sets `module: CommonJS`, `strict: true`, decorators enabled.
- Each workspace extends base and outputs to `dist/` from `src/`.
- Node 24 is required (see `engines` and `Dockerfile` base images).

## Architecture

- **API (`apps/api`)**: NestJS. Upload endpoint → MinIO → PostgreSQL → RabbitMQ.
- **Worker (`apps/worker`)**: Consumes RabbitMQ, downloads from MinIO, transforms with Sharp, uploads outputs, updates DB.
- **Shared (`packages/shared`)**: TypeORM entities (`Job`), queue contracts, message types.
- TypeORM `synchronize: true` is enabled in development only (`process.env.NODE_ENV !== 'production'`).

## Testing

- **Unit tests**: Jest + ts-jest in each workspace.
  - `npm run test` runs all workspace tests.
  - `npm run --workspace @frameforge/<name> test` for a single workspace.
- **End-to-end tests**: `e2e/` directory with Jest tests covering upload → process → status.
  - Requires infra running: `docker compose up -d`.
  - Run with `npm run test:e2e`.

## Lint & Format

- **ESLint**: `npm run lint` (typescript-eslint configured).
- **Prettier**: `npm run format` / `npm run format:check`.
- Warnings for `any` in test mocks are expected and acceptable.

## Docker

- Both apps use multi-stage Dockerfiles.
- Worker image installs `libvips42` in the runner stage because Sharp requires native deps.
- API image does not need native deps.
- `NODE_ENV=production` set in runner stages.
- API Dockerfile includes a `HEALTHCHECK` on `/health`.

## CI

- GitHub Actions runs lint, format check, security audit, tests (with coverage), build, e2e tests, and Docker builds.
- Trivy vulnerability scanner runs on Docker images.
- `npm audit` runs with `--audit-level=moderate`.

## Deployment

- Helm chart at `charts/frameforge/`.
- K8s infra manifests at `infra/k8s/infra/` (Postgres, MinIO, RabbitMQ, secrets, network policies).
- Monitoring manifests at `infra/k8s/monitoring/` (ServiceMonitors, Grafana dashboard).
- Argo CD app manifest at `infra/argocd/app.yaml`.
- KEDA is present in Helm values but `enabled: false` by default.
- Security contexts (`runAsNonRoot`, `allowPrivilegeEscalation: false`, `capabilities: drop: [ALL]`) are configured in Helm deployments and raw K8s manifests.

## Important Constraints

- Worker validates idempotency: skips jobs already in `done` status.
- Max retry attempts = 3; non-retryable errors go directly to DLQ.
- Only image processing is supported in MVP (worker rejects video).
- Allowed upload MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- Max upload size: 50 MB.
- `contexts/` is gitignored but contains a design doc (`README_FrameForge.md`).

## Environment Quirks

- When starting services via `npm run --workspace`, use `env $(cat .env | xargs) npm run ...` rather than `export && npm run ...` to ensure variables are visible to the spawned process.
