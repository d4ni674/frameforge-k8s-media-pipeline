# FrameForge — Deployment & Operations Guide

## Architecture Overview

FrameForge is an event-driven media processing platform on Kubernetes.

**Flow**: Client → API (upload) → PostgreSQL + MinIO + RabbitMQ → Worker (process) → MinIO (output) → PostgreSQL (status)

---

## Quick Start

### Local Development (Docker Compose)

```bash
# Start infrastructure
docker compose up -d

# Copy env file
cp .env.example .env

# Install dependencies
npm install

# Build shared package (required before API/Worker)
npm run --workspace @frameforge/shared build

# Start API
env $(cat .env | xargs) npm run dev:api

# In another terminal, start Worker
env $(cat .env | xargs) npm run dev:worker
```

> **Note**: Use `env $(cat .env | xargs)` rather than `export` to ensure variables are visible to `npm run --workspace`.

### Kubernetes Deployment (kind + Helm)

```bash
# 1. Create cluster
kind create cluster --name frameforge

# 2. Build and load images
docker build -f apps/api/Dockerfile -t frameforge-api:0.1.0 .
docker build -f apps/worker/Dockerfile -t frameforge-worker:0.1.0 .
kind load docker-image frameforge-api:0.1.0 --name frameforge
kind load docker-image frameforge-worker:0.1.0 --name frameforge

# 3. Create namespace
kubectl create namespace frameforge

# 4. Deploy infrastructure
kubectl apply -f infra/k8s/infra/

# 5. Wait for infrastructure to be ready
kubectl wait --for=condition=available deployment/postgres deployment/rabbitmq deployment/minio -n frameforge --timeout=120s

# 6. Deploy FrameForge
helm install frameforge ./charts/frameforge -n frameforge

# 7. Deploy monitoring
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  --set grafana.service.type=NodePort

# 8. Apply ServiceMonitors and dashboard
kubectl apply -f infra/k8s/monitoring/
```

---

## Credentials & Access

### Local Development

| Service                 | URL                           | Username     | Password     |
| ----------------------- | ----------------------------- | ------------ | ------------ |
| **API**                 | http://localhost:3000         | —            | —            |
| **API Metrics**         | http://localhost:3000/metrics | —            | —            |
| **Worker Metrics**      | http://localhost:9090/metrics | —            | —            |
| **PostgreSQL**          | localhost:5432                | `frameforge` | `frameforge` |
| **MinIO Console**       | http://localhost:9001         | `minioadmin` | `minioadmin` |
| **MinIO API**           | localhost:9000                | `minioadmin` | `minioadmin` |
| **RabbitMQ Management** | http://localhost:15672        | `frameforge` | `frameforge` |
| **RabbitMQ AMQP**       | localhost:5672                | `frameforge` | `frameforge` |

### Kubernetes

| Service                 | Access Method                                                                                 | Credentials                    |
| ----------------------- | --------------------------------------------------------------------------------------------- | ------------------------------ |
| **API**                 | `kubectl port-forward svc/frameforge-api 30001:30000 -n frameforge` → http://localhost:30001  | —                              |
| **PostgreSQL**          | Inside cluster at `postgres.frameforge.svc.cluster.local:5432`                                | `frameforge` / `frameforge`    |
| **MinIO Console**       | `kubectl port-forward svc/minio 9001:9001 -n frameforge` → http://localhost:9001              | `minioadmin` / `minioadmin123` |
| **MinIO API**           | Inside cluster at `minio.frameforge.svc.cluster.local:9000`                                   | `minioadmin` / `minioadmin123` |
| **RabbitMQ Management** | `kubectl port-forward svc/rabbitmq 15672:15672 -n frameforge` → http://localhost:15672        | `frameforge` / `frameforge`    |
| **Grafana**             | `kubectl port-forward svc/prometheus-grafana 30002:80 -n monitoring` → http://localhost:30002 | `admin` / _(see below)_        |

#### Grafana Password

```bash
kubectl -n monitoring get secrets prometheus-grafana \
  -o jsonpath="{.data.admin-password}" | base64 -d
```

---

## API Endpoints

### POST /jobs

Upload a media file and create a processing job.

```bash
curl -X POST http://localhost:30001/jobs \
  -F "file=@photo.png" \
  -F "mediaType=image" \
  -F "processingProfile=thumbnail"
```

**Profiles**: `thumbnail` (200×200), `resized-800` (800×800), `webp` (full-size WebP)

**Response**:

```json
{
  "id": "uuid",
  "status": "queued",
  "mediaType": "image",
  "processingProfile": "thumbnail"
}
```

### GET /jobs/:id

Full job details including output manifest.

### GET /jobs/:id/status

Lightweight job status only.

### GET /jobs?page=1&limit=20&status=done

Paginated job list with optional status filter.

### GET /health

Health check endpoint.

### GET /metrics

Prometheus metrics endpoint.

---

## Worker Metrics (port 9090)

### GET /metrics

Prometheus metrics — worker-side processing metrics.

Key metrics:

- `frameforge_worker_jobs_started_total`
- `frameforge_worker_jobs_completed_total`
- `frameforge_worker_jobs_failed_total`
- `frameforge_worker_processing_duration_seconds`

---

## Scaling

### Local / Docker Compose

Workers are single-process. To simulate a worker pool locally, run multiple worker terminals with different `METRICS_PORT` values:

```bash
# Terminal 1
env $(cat .env | xargs) npm run dev:worker

# Terminal 2
env $(cat .env | xargs) METRICS_PORT=9091 npm run dev:worker

# Terminal 3
env $(cat .env | xargs) METRICS_PORT=9092 npm run dev:worker
```

All workers connect to the same RabbitMQ queue (`media.jobs`) and compete for jobs.

### Kubernetes (Helm + KEDA)

KEDA is present in the Helm chart but **disabled by default** (`keda.enabled: false`).

To enable event-driven autoscaling based on queue depth:

```bash
helm upgrade frameforge ./charts/frameforge -n frameforge \
  --set keda.enabled=true
```

This creates a `ScaledObject` that monitors `media.jobs` queue depth and scales workers between `0` and `10` replicas (default settings in `values.yaml`).

**KEDA values** (from `values.yaml`):

- `pollingInterval: 15` — how often KEDA checks the queue
- `cooldownPeriod: 300` — how long to wait before scaling down
- `minReplicaCount: 0` — scale to zero when idle
- `maxReplicaCount: 10` — maximum replicas during load
- `queueLength: 20` — target messages per pod

Example: queue depth = 240 → desired replicas = ceil(240 / 20) = 12, capped at 10.

**Manual scaling** (without KEDA):

```bash
kubectl scale deployment frameforge-worker --replicas=3 -n frameforge
```

**Scale API**:

```bash
kubectl scale deployment frameforge-api --replicas=2 -n frameforge
```

### Verifying Scale

1. **Queue depth**: Check RabbitMQ Management UI (`http://localhost:15672` or port-forwarded).
2. **Worker replicas**: `kubectl get pods -n frameforge`.
3. **Prometheus metrics**: Both API and Worker expose `/metrics`.
4. **Grafana dashboard**: Shows queue depth, throughput, worker replica count, processing duration.

### Generating Load for Scale Testing

```bash
# Port-forward API
kubectl port-forward svc/frameforge-api 30000:30000 -n frameforge &

# Upload 100 images
for i in {1..100}; do
  curl -s -X POST http://localhost:30000/jobs \
    -F "file=@test.png" \
    -F "mediaType=image" \
    -F "processingProfile=thumbnail" > /dev/null &
done
wait

# Watch worker pods scale
watch kubectl get pods -n frameforge
```

---

## Queue Architecture

```
media.jobs  ──→  Worker processes  ──→  success → PostgreSQL (done)
        │                              │
        └──> retry (nack) ──→  media.jobs.retry (30s TTL)
                                       │
                                       └──> dead-letter back to media.jobs
                                            (up to MAX_ATTEMPTS=3)

media.jobs.dlq  ←──  terminal failures after max retries
```

---

## Kubernetes Resources

```bash
# View all pods
kubectl get pods -n frameforge

# View API logs
kubectl logs deployment/frameforge-api -n frameforge

# View Worker logs
kubectl logs deployment/frameforge-worker -n frameforge

# Scale worker manually
kubectl scale deployment frameforge-worker --replicas=3 -n frameforge

# Port-forward API
kubectl port-forward svc/frameforge-api 30001:30000 -n frameforge

# Port-forward Grafana
kubectl port-forward svc/prometheus-grafana 30002:80 -n monitoring
```

---

## Monitoring

### Grafana Dashboard

The FrameForge dashboard is auto-provisioned in Grafana. It shows:

- Queue depth (main, retry, DLQ)
- Jobs created / completed / failed per profile
- Processing duration (p50, p95, p99)
- Worker replica count
- Upload failure rate

### Prometheus Targets

Both API (`/metrics`) and Worker (`:9090/metrics`) are scraped via ServiceMonitors.

---

## Environment Variables

| Variable           | Description         | Default                                     |
| ------------------ | ------------------- | ------------------------------------------- |
| `PG_HOST`          | PostgreSQL host     | localhost                                   |
| `PG_PORT`          | PostgreSQL port     | 5432                                        |
| `PG_USER`          | PostgreSQL user     | frameforge                                  |
| `PG_PASSWORD`      | PostgreSQL password | frameforge                                  |
| `PG_DATABASE`      | PostgreSQL database | frameforge                                  |
| `MINIO_ENDPOINT`   | MinIO endpoint      | localhost                                   |
| `MINIO_PORT`       | MinIO port          | 9000                                        |
| `MINIO_ACCESS_KEY` | MinIO access key    | minioadmin                                  |
| `MINIO_SECRET_KEY` | MinIO secret key    | minioadmin                                  |
| `MINIO_BUCKET`     | MinIO bucket name   | frameforge                                  |
| `MINIO_USE_SSL`    | Use SSL for MinIO   | false                                       |
| `RABBITMQ_URL`     | RabbitMQ AMQP URL   | amqp://frameforge:frameforge@localhost:5672 |
| `PORT`             | API listen port     | 3000                                        |
| `METRICS_PORT`     | Worker metrics port | 9090                                        |

---

## Object Storage Layout

```
originals/{jobId}/source          ← uploaded original
outputs/{jobId}/thumbnail.webp   ← 200×200 thumbnail
outputs/{jobId}/resized-800.webp  ← 800×800 resized
outputs/{jobId}/optimized.webp    ← full-size WebP optimization
```

---

## Job Lifecycle States

`queued` → `processing` → `done` or `failed`

- Max 3 attempts with exponential backoff
- Idempotent: workers skip already-completed jobs
- Non-retryable errors (bad format) route directly to DLQ

---

## Security Notes

- All containers run as non-root (`runAsNonRoot: true`).
- `allowPrivilegeEscalation: false` and `capabilities: drop: [ALL]` are set.
- NetworkPolicies restrict pod-to-pod traffic (default deny, explicit allow).
- Docker images use `NODE_ENV=production` and `--ignore-scripts` during install.
- Trivy vulnerability scanning runs in CI.
