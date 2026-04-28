# FrameForge — Testing Guide

This document covers how to test FrameForge locally, from unit tests to end-to-end flows and load testing.

## Prerequisites

```bash
npm install
docker compose up -d
cp .env.example .env
npm run --workspace @frameforge/shared build
```

---

## Unit Tests

Each workspace has its own Jest + ts-jest setup.

### Run All Tests

```bash
npm run test
```

### Run Single Workspace

```bash
npm run --workspace @frameforge/shared test
npm run --workspace @frameforge/api test
npm run --workspace @frameforge/worker test
```

### Coverage

```bash
npm run --workspace @frameforge/api test:cov
npm run --workspace @frameforge/worker test:cov
```

Coverage reports are written to `<workspace>/coverage/`.

---

## Lint & Format Checks

```bash
npm run lint       # ESLint across all TS files
npm run lint:fix   # Auto-fix issues
npm run format     # Prettier write
npm run format:check
```

---

## End-to-End Tests

The `e2e/` directory contains Jest-based tests that exercise the full pipeline: upload → queue → process → status.

### Prerequisites

Infrastructure must be running:

```bash
docker compose up -d
```

All workspaces must be built:

```bash
npm run -ws build
```

### Run E2E Tests

```bash
# Install e2e dependencies
cd e2e && npm install

# From root (recommended)
npm run test:e2e
```

This starts the API and Worker, runs the e2e suite, and tears them down.

### Manual E2E Walkthrough

If you prefer to run the steps manually:

```bash
# Terminal 1: Start API
env $(cat .env | xargs) npm run --workspace @frameforge/api start

# Terminal 2: Start Worker
env $(cat .env | xargs) npm run --workspace @frameforge/worker start

# Terminal 3: Run tests
cd e2e && npm test
```

### What E2E Tests Cover

- `POST /jobs` with `thumbnail`, `resized-800`, and `webp` profiles
- Status polling until `done`
- Output manifest verification
- Rejection of unsupported file types (400)
- Rejection of video media type in MVP (400)

---

## Manual API Testing

### Upload Image

```bash
curl -X POST http://localhost:3000/jobs \
  -F "file=@your-image.png" \
  -F "mediaType=image" \
  -F "processingProfile=thumbnail"
```

**Supported profiles**: `thumbnail`, `resized-800`, `webp`

**Response**:

```json
{
  "id": "b33d73eb-8a61-4e4f-928b-b08d59a15bda",
  "status": "queued",
  "mediaType": "image",
  "processingProfile": "thumbnail"
}
```

### Poll Status

```bash
JOB_ID="b33d73eb-8a61-4e4f-928b-b08d59a15bda"
curl http://localhost:3000/jobs/$JOB_ID/status
```

### Get Full Job

```bash
curl http://localhost:3000/jobs/$JOB_ID | jq .
```

Expected `done` response:

```json
{
  "id": "...",
  "status": "done",
  "mediaType": "image",
  "processingProfile": "thumbnail",
  "outputManifest": {
    "thumbnail": "outputs/{id}/thumbnail.webp"
  },
  "attemptCount": 0,
  "lastError": null,
  ...
}
```

### List Jobs

```bash
curl "http://localhost:3000/jobs?page=1&limit=20&status=done"
```

### Health Check

```bash
curl http://localhost:3000/health
```

### Prometheus Metrics

```bash
# API metrics
curl http://localhost:3000/metrics

# Worker metrics
curl http://localhost:9090/metrics
```

---

## Testing Scale

### Scale Workers Locally

Run multiple worker processes with different `METRICS_PORT` values to simulate a worker pool:

```bash
# Terminal 1
env $(cat .env | xargs) npm run dev:worker

# Terminal 2
env $(cat .env | xargs) METRICS_PORT=9091 npm run dev:worker

# Terminal 3
env $(cat .env | xargs) METRICS_PORT=9092 npm run dev:worker
```

All instances compete for jobs from the same `media.jobs` queue.

### Generate Load

Use a simple bash loop to upload many images:

```bash
for i in {1..50}; do
  curl -s -X POST http://localhost:3000/jobs \
    -F "file=@test.png" \
    -F "mediaType=image" \
    -F "processingProfile=thumbnail" > /dev/null &
done
wait
echo "Done uploading 50 jobs"
```

Watch the queue in RabbitMQ Management (`http://localhost:15672`) and observe workers consuming jobs concurrently.

### Kubernetes Scaling

Enable KEDA autoscaling:

```bash
helm upgrade frameforge ./charts/frameforge -n frameforge \
  --set keda.enabled=true
```

KEDA monitors `media.jobs` queue depth and scales workers between `0` and `10` replicas (default).

To watch scaling in action:

```bash
# Generate load
kubectl port-forward svc/frameforge-api 30000:30000 -n frameforge &
for i in {1..100}; do
  curl -s -X POST http://localhost:30000/jobs \
    -F "file=@test.png" \
    -F "mediaType=image" \
    -F "processingProfile=thumbnail" > /dev/null &
done

# Watch replicas scale
watch kubectl get pods -n frameforge
```

---

## Verifying Output

### MinIO (Local)

Open the MinIO Console at `http://localhost:9001` (login: `minioadmin` / `minioadmin`) and browse the `frameforge` bucket.

Expected layout:

```
originals/{jobId}/source
outputs/{jobId}/thumbnail.webp
outputs/{jobId}/resized-800.webp
outputs/{jobId}/optimized.webp
```

### PostgreSQL (Local)

```bash
psql -h localhost -U frameforge -d frameforge
```

Query jobs:

```sql
SELECT id, status, processing_profile, attempt_count, output_manifest FROM jobs;
```

### RabbitMQ (Local)

Management UI: `http://localhost:15672` (login: `frameforge` / `frameforge`)

Queues to watch:

- `media.jobs` — main queue
- `media.jobs.retry` — retry queue (30s TTL)
- `media.jobs.dlq` — dead-letter queue

---

## Troubleshooting

### "Missing required environment variable"

Use `env $(cat .env | xargs)` before npm commands to ensure env vars are visible to the spawned process:

```bash
env $(cat .env | xargs) npm run --workspace @frameforge/api start
```

### E2E Tests Time Out

Ensure both API and Worker are running and RabbitMQ/Postgres/MinIO are healthy:

```bash
docker compose ps
```

### TypeScript Build Errors in Tests

Make sure shared is built first:

```bash
npm run --workspace @frameforge/shared build
```

### Sharp / libvips Errors in Worker

Ensure `libvips` is installed on your system, or use the Docker image which includes it.

---

## CI Testing

The GitHub Actions workflow runs:

1. `npm run lint`
2. `npm run format:check`
3. `npm audit --audit-level=moderate`
4. Workspace tests with coverage
5. Full workspace build
6. E2E tests (with docker compose)
7. Docker image builds
8. Trivy vulnerability scans
