import { Injectable } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from "@nestjs/terminus";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class MinioHealthIndicator extends HealthIndicator {
  constructor(private readonly storage: StorageService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.storage.checkBucket();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        "MinIO health check failed",
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
