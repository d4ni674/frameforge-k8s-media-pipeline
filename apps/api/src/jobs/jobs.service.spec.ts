import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Job } from "@frameforge/shared";
import { JobsService } from "./jobs.service";
import { StorageService } from "../storage/storage.service";
import { MqService } from "../mq/mq.service";
import { MetricsService } from "../metrics";
import { NotFoundException } from "@nestjs/common";

describe("JobsService", () => {
  let service: JobsService;

  const mockJobRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockStorage = {
    upload: jest.fn(),
  };

  const mockMq = {
    publish: jest.fn(),
  };

  const mockMetrics = {
    recordUpload: jest.fn(),
    recordJobCreated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(Job), useValue: mockJobRepo },
        { provide: StorageService, useValue: mockStorage },
        { provide: MqService, useValue: mockMq },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a job, upload file, and publish message", async () => {
      const file = {
        buffer: Buffer.from("test"),
        mimetype: "image/png",
        originalname: "test.png",
        size: 100,
      };
      const savedJob = {
        id: "uuid",
        status: "queued",
        mediaType: "image",
        processingProfile: "thumbnail",
        createdAt: new Date(),
      };

      mockJobRepo.create.mockReturnValue(savedJob);
      mockJobRepo.save.mockResolvedValue(savedJob);

      const result = await service.create(file as any, "image", "thumbnail");

      expect(mockStorage.upload).toHaveBeenCalled();
      expect(mockJobRepo.save).toHaveBeenCalled();
      expect(mockMq.publish).toHaveBeenCalled();
      expect(mockMetrics.recordUpload).toHaveBeenCalledWith("image", "thumbnail");
      expect(mockMetrics.recordJobCreated).toHaveBeenCalledWith("image", "thumbnail");
      expect(result.status).toBe("queued");
    });
  });

  describe("findById", () => {
    it("should return a job when found", async () => {
      const job = { id: "1" } as Job;
      mockJobRepo.findOne.mockResolvedValue(job);
      expect(await service.findById("1")).toEqual(job);
    });

    it("should throw NotFoundException when job not found", async () => {
      mockJobRepo.findOne.mockResolvedValue(null);
      await expect(service.findById("1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("should return paginated results", async () => {
      mockJobRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.findAll(1, 20, "queued");
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });
});
