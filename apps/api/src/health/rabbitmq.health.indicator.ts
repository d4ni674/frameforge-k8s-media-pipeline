import { Injectable } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { MqService } from "../mq/mq.service";

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
  constructor(private readonly mq: MqService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // The MqService manages the channel; we check if it's still connected
      // by accessing the underlying connection state through a simple check
      // Since MqService doesn't expose connection directly, we'll do a no-op
      // publish to a test exchange or just check if the service is initialized.
      // For simplicity, we check if the module init succeeded (channel exists).
      const isHealthy = this.mq.isConnected();
      return this.getStatus(key, isHealthy);
    } catch (error) {
      throw new HealthCheckError(
        "RabbitMQ health check failed",
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
