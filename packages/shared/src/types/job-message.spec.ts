import {
  JobMessage,
  MEDIA_QUEUE,
  MEDIA_RETRY_QUEUE,
  MEDIA_DLQ,
  MAX_ATTEMPTS,
  RETRY_DELAY_MS,
} from "./job-message";

describe("JobMessage constants", () => {
  it("should define correct queue names", () => {
    expect(MEDIA_QUEUE).toBe("media.jobs");
    expect(MEDIA_RETRY_QUEUE).toBe("media.jobs.retry");
    expect(MEDIA_DLQ).toBe("media.jobs.dlq");
  });

  it("should define correct retry policy", () => {
    expect(MAX_ATTEMPTS).toBe(3);
    expect(RETRY_DELAY_MS).toBe(30_000);
  });
});

describe("JobMessage interface", () => {
  it("should accept valid job message structure", () => {
    const message: JobMessage = {
      jobId: "test-id",
      mediaType: "image",
      processingProfile: "thumbnail",
      processingVersion: 1,
      sourceObjectKey: "originals/test-id/source",
      createdAt: new Date().toISOString(),
    };

    expect(message.jobId).toBe("test-id");
    expect(message.mediaType).toBe("image");
  });
});
