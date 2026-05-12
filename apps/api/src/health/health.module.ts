import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { MqModule } from "../mq/mq.module";
import { StorageModule } from "../storage/storage.module";
import { HealthController } from "./health.controller";
import { RabbitMQHealthIndicator } from "./rabbitmq.health.indicator";
import { MinioHealthIndicator } from "./minio.health.indicator";

@Module({
  imports: [TerminusModule, MqModule, StorageModule],
  controllers: [HealthController],
  providers: [RabbitMQHealthIndicator, MinioHealthIndicator],
})
export class HealthModule {}
