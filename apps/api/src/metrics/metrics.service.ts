import { Injectable } from "@nestjs/common";

import { Registry, Counter, collectDefaultMetrics } from "prom-client";

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
}
