import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from "@nestjs/terminus";
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
  check() {
    return this.health.check([
      () => this.db.pingCheck("database"),
      () => this.rabbitmq.isHealthy("rabbitmq"),
    ]);
  }
}
