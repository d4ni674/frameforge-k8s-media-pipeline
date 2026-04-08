export type JobStatus = "queued" | "processing" | "done" | "failed";

export interface JobMessage {
  jobId: string;
  mediaType: "image" | "video";
  profile: string;
  sourceObjectKey: string;
  createdAt: string;
}
