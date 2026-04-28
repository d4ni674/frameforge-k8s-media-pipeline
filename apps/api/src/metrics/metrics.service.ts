import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

export const METRICS_REGISTRY = new Registry();

collectDefaultMetrics({ register: METRICS_REGISTRY });

export const uploadCounter = new Counter({
  name: "frameforge_upload_requests_total",
  help: "Total number of upload requests",
  labelNames: ["media_type", "profile"],
  registers: [METRICS_REGISTRY],
});

export const uploadFailureCounter = new Counter({
  name: "frameforge_upload_failures_total",
  help: "Total number of upload failures",
  labelNames: ["reason"],
  registers: [METRICS_REGISTRY],
});

export const jobsCreatedCounter = new Counter({
  name: "frameforge_jobs_created_total",
  help: "Total number of jobs created",
  labelNames: ["media_type", "profile"],
  registers: [METRICS_REGISTRY],
});

export const jobsCompletedCounter = new Counter({
  name: "frameforge_jobs_completed_total",
  help: "Total number of jobs completed",
  labelNames: ["media_type", "profile"],
  registers: [METRICS_REGISTRY],
});

export const jobsFailedCounter = new Counter({
  name: "frameforge_jobs_failed_total",
  help: "Total number of jobs failed",
  labelNames: ["media_type", "reason"],
  registers: [METRICS_REGISTRY],
});

export const processingDurationHistogram = new Histogram({
  name: "frameforge_job_processing_duration_seconds",
  help: "Job processing duration in seconds",
  labelNames: ["profile"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [METRICS_REGISTRY],
});

import { Injectable } from "@nestjs/common";

@Injectable()
export class MetricsService {
  recordUpload(mediaType: string, profile: string): void {
    uploadCounter.inc({ media_type: mediaType, profile });
  }

  recordUploadFailure(reason: string): void {
    uploadFailureCounter.inc({ reason });
  }

  recordJobCreated(mediaType: string, profile: string): void {
    jobsCreatedCounter.inc({ media_type: mediaType, profile });
  }

  recordJobCompleted(mediaType: string, profile: string): void {
    jobsCompletedCounter.inc({ media_type: mediaType, profile });
  }

  recordJobFailed(mediaType: string, reason: string): void {
    jobsFailedCounter.inc({ media_type: mediaType, reason });
  }

  recordProcessingDuration(durationMs: number, profile: string): void {
    processingDurationHistogram.observe({ profile }, durationMs / 1000);
  }
}