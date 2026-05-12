import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job } from "@frameforge/shared";

import { JobSweeperService } from "./job-sweeper.service";
import { MqService } from "../mq/mq.service";

describe("JobSweeperService", () => {
  let service: JobSweeperService;
  let mockRepo: Partial<Repository<Job>>;
  let mockMq: Partial<MqService>;

  beforeEach(async () => {
    jest.useFakeTimers();
    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    mockMq = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        JobSweeperService,
        { provide: getRepositoryToken(Job), useValue: mockRepo },
        { provide: MqService, useValue: mockMq },
      ],
    }).compile();

    service = module.get(JobSweeperService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("should re-publish stuck jobs", async () => {
    const oldDate = new Date(Date.now() - 10 * 60 * 1000);
    const stuckJob = {
      id: "stuck-1",
      status: "queued",
      attemptCount: 0,
      createdAt: oldDate,
      mediaType: "image",
      processingProfile: "thumbnail",
      processingVersion: 1,
      sourceObjectKey: "originals/stuck-1/source",
    } as Job;

    (mockRepo.find as jest.Mock).mockResolvedValue([stuckJob]);

    await service.sweepStuckJobs();

    expect(mockRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "queued",
          attemptCount: 0,
        }),
      }),
    );
    expect(mockMq.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "stuck-1",
        mediaType: "image",
        processingProfile: "thumbnail",
      }),
    );
  });

  it("should do nothing when no stuck jobs found", async () => {
    (mockRepo.find as jest.Mock).mockResolvedValue([]);

    await service.sweepStuckJobs();

    expect(mockMq.publish).not.toHaveBeenCalled();
  });

  it("should handle publish errors gracefully", async () => {
    const oldDate = new Date(Date.now() - 10 * 60 * 1000);
    const stuckJob = {
      id: "stuck-2",
      status: "queued",
      attemptCount: 0,
      createdAt: oldDate,
      mediaType: "image",
      processingProfile: "thumbnail",
      processingVersion: 1,
      sourceObjectKey: "originals/stuck-2/source",
    } as Job;

    (mockRepo.find as jest.Mock).mockResolvedValue([stuckJob]);
    (mockMq.publish as jest.Mock).mockRejectedValue(new Error("MQ down"));

    // Should not throw
    await expect(service.sweepStuckJobs()).resolves.not.toThrow();
    expect(mockMq.publish).toHaveBeenCalled();
  });
});
