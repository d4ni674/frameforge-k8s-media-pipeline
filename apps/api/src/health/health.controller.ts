import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../auth";

import { RabbitMQHealthIndicator } from "./rabbitmq.health.indicator";
import { MinioHealthIndicator } from "./minio.health.indicator";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private rabbitmq: RabbitMQHealthIndicator,
    private minio: MinioHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @Public()
  @SkipThrottle()
  check() {
    return this.health.check([
      () => this.db.pingCheck("database"),
      () => this.rabbitmq.isHealthy("rabbitmq"),
      () => this.minio.isHealthy("minio"),
    ]);
  }
}
