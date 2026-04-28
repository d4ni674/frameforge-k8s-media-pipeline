import { Test, TestingModule } from "@nestjs/testing";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("JobsController", () => {
  let controller: JobsController;
  let service: JobsService;

  const mockService = {
    create: jest.fn(),
    findById: jest.fn(),
    findStatus: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [{ provide: JobsService, useValue: mockService }],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
    jest.clearAllMocks();
  });

  describe("createJob", () => {
    it("should create a job with valid file and body", async () => {
      const file = {
        buffer: Buffer.from("test"),
        mimetype: "image/png",
        originalname: "test.png",
        size: 100,
      } as Express.Multer.File;

      const body = { mediaType: "image" as const, processingProfile: "thumbnail" as const };
      const expected = { id: "uuid", status: "queued", mediaType: "image", processingProfile: "thumbnail" };

      mockService.create.mockResolvedValue(expected);

      const result = await controller.createJob(file, body);
      expect(result).toEqual(expected);
      expect(service.create).toHaveBeenCalledWith(file, "image", "thumbnail");
    });

    it("should throw BadRequestException when file is missing", async () => {
      await expect(controller.createJob(undefined, { mediaType: "image", processingProfile: "thumbnail" })).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for unsupported mime type", async () => {
      const file = { buffer: Buffer.from("test"), mimetype: "application/pdf", originalname: "test.pdf", size: 100 } as Express.Multer.File;
      await expect(controller.createJob(file, { mediaType: "image", processingProfile: "thumbnail" })).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for non-image media type", async () => {
      const file = { buffer: Buffer.from("test"), mimetype: "image/png", originalname: "test.png", size: 100 } as Express.Multer.File;
      await expect(controller.createJob(file, { mediaType: "video", processingProfile: "thumbnail" })).rejects.toThrow(BadRequestException);
    });
  });

  describe("getJob", () => {
    it("should return a job by id", async () => {
      const job = { id: "1", status: "queued" } as any;
      mockService.findById.mockResolvedValue(job);
      expect(await controller.getJob("1")).toEqual(job);
    });

    it("should throw NotFoundException when job not found", async () => {
      mockService.findById.mockRejectedValue(new NotFoundException());
      await expect(controller.getJob("1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("listJobs", () => {
    it("should return paginated jobs", async () => {
      const result = { data: [], total: 0, page: 1, limit: 20 };
      mockService.findAll.mockResolvedValue(result);
      expect(await controller.listJobs()).toEqual(result);
    });
  });
});
