import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { MqModule } from "../mq/mq.module";
import { HealthController } from "./health.controller";
import { RabbitMQHealthIndicator } from "./rabbitmq.health.indicator";

@Module({
  imports: [TerminusModule, MqModule],
  controllers: [HealthController],
  providers: [RabbitMQHealthIndicator],
})
export class HealthModule {}
