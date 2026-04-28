import type { MediaType, ProcessingProfile } from "../entities/job.entity";

export interface JobMessage {
  jobId: string;
  mediaType: MediaType;
  processingProfile: ProcessingProfile;
  processingVersion: number;
  sourceObjectKey: string;
  createdAt: string;
}

export const PROCESSING_EXCHANGE = "media";

export const MEDIA_QUEUE = "media.jobs";
export const MEDIA_RETRY_QUEUE = "media.jobs.retry";
export const MEDIA_DLQ = "media.jobs.dlq";

export const MAX_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 30_000;
