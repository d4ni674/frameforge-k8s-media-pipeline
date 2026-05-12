import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../auth";

import { RabbitMQHealthIndicator } from "./rabbitmq.health.indicator";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private rabbitmq: RabbitMQHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @Public()
  @SkipThrottle()
  check() {
    return this.health.check([
      () => this.db.pingCheck("database"),
      () => this.rabbitmq.isHealthy("rabbitmq"),
    ]);
  }
}
