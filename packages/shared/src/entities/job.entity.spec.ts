import { Job, PROCESSING_VERSION } from "./job.entity";

describe("Job Entity", () => {
  it("should have correct processing version", () => {
    expect(PROCESSING_VERSION).toBe(1);
  });

  it("should create a job instance with default values", () => {
    const job = new Job();
    job.id = "test-id";
    job.status = "queued";
    job.mediaType = "image";
    job.processingProfile = "thumbnail";
    job.sourceObjectKey = "originals/test-id/source";

    expect(job.processingVersion).toBe(PROCESSING_VERSION);
    expect(job.attemptCount).toBe(0);
    expect(job.sourceHash).toBeNull();
    expect(job.outputManifest).toBeNull();
    expect(job.lastError).toBeNull();
    expect(job.startedAt).toBeNull();
    expect(job.finishedAt).toBeNull();
  });
});
