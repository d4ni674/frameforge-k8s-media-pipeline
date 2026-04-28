import { createServer } from "node:http";
import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

export const jobsStartedCounter = new Counter({
  name: "frameforge_worker_jobs_started_total",
  help: "Total number of jobs started by the worker",
  labelNames: ["media_type", "profile"],
  registers: [registry],
});

export const jobsCompletedCounter = new Counter({
  name: "frameforge_worker_jobs_completed_total",
  help: "Total number of jobs completed successfully",
  labelNames: ["media_type", "profile"],
  registers: [registry],
});

export const jobsFailedCounter = new Counter({
  name: "frameforge_worker_jobs_failed_total",
  help: "Total number of jobs that failed",
  labelNames: ["media_type", "reason"],
  registers: [registry],
});

export const processingDurationHistogram = new Histogram({
  name: "frameforge_worker_processing_duration_seconds",
  help: "Time spent processing a job in seconds",
  labelNames: ["profile"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [registry],
});

export function startMetricsServer(port: number, log: (msg: string) => void = console.log): void {
  const server = createServer(async (req, res) => {
    if (req.url === "/metrics" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": registry.contentType });
      res.end(await registry.metrics());
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    log(`Worker metrics server listening on port ${port}`);
  });
}