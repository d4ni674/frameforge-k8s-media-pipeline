import { HealthCheckError } from "@nestjs/terminus";
import { MinioHealthIndicator } from "./minio.health.indicator";
import { StorageService } from "../storage/storage.service";

describe("MinioHealthIndicator", () => {
  let indicator: MinioHealthIndicator;
  let mockStorage: Partial<StorageService>;

  beforeEach(() => {
    mockStorage = {
      checkBucket: jest.fn(),
    };
    indicator = new MinioHealthIndicator(mockStorage as StorageService);
  });

  it("should return healthy when bucket exists", async () => {
    (mockStorage.checkBucket as jest.Mock).mockResolvedValue(undefined);

    const result = await indicator.isHealthy("minio");
    expect(result).toEqual({ minio: { status: "up" } });
  });

  it("should throw HealthCheckError when bucket check fails", async () => {
    (mockStorage.checkBucket as jest.Mock).mockRejectedValue(new Error("Connection refused"));

    await expect(indicator.isHealthy("minio")).rejects.toThrow(HealthCheckError);
  });
});
