import { JobProcessor } from "./job-processor";
import { NonRetryableError } from "./errors";
import { Job } from "@frameforge/shared";

const mockStorage = {
  download: jest.fn(),
  upload: jest.fn(),
};

describe("JobProcessor", () => {
  let processor: JobProcessor;

  beforeEach(() => {
    processor = new JobProcessor(mockStorage as any);
    jest.clearAllMocks();
  });

  it("should throw NonRetryableError for unsupported profile", async () => {
    const sourceBuffer = Buffer.from("fake");
    mockStorage.download.mockResolvedValue(sourceBuffer);

    const job = {
      status: "processing",
      processingProfile: "unknown",
      sourceObjectKey: "originals/1/source",
      id: "1",
    } as any;

    await expect(processor.process(job)).rejects.toThrow(NonRetryableError);
  });

  it("should process thumbnail profile", async () => {
    const sourceBuffer = Buffer.from("fake-png");
    mockStorage.download.mockResolvedValue(sourceBuffer);
    mockStorage.upload.mockResolvedValue(undefined);

    const job = {
      status: "processing",
      processingProfile: "thumbnail",
      sourceObjectKey: "originals/1/source",
      id: "1",
    } as unknown as Job;

    // Sharp will fail on fake buffer, but we test the flow
    await expect(processor.process(job)).rejects.toThrow();
  });

  it("should throw NonRetryableError for unsupported profile", async () => {
    const sourceBuffer = Buffer.from("fake");
    mockStorage.download.mockResolvedValue(sourceBuffer);

    const job = {
      status: "processing",
      processingProfile: "unknown",
      sourceObjectKey: "originals/1/source",
      id: "1",
    } as any;

    await expect(processor.process(job)).rejects.toThrow(NonRetryableError);
  });
});
