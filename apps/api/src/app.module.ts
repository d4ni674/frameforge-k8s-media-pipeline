import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Job } from "@frameforge/shared";

import { ConfigModule } from "./config/config.module";
import { ConfigService } from "./config/config.service";
import { StorageModule } from "./storage/storage.module";
import { MqModule } from "./mq/mq.module";
import { HealthModule } from "./health/health.module";
import { JobsModule } from "./jobs/jobs.module";
import { MetricsController, MetricsService } from "./metrics";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        host: config.pgHost,
        port: config.pgPort,
        username: config.pgUser,
        password: config.pgPassword,
        database: config.pgDatabase,
        entities: [Job],
        synchronize: process.env.NODE_ENV !== "production",
      }),
    }),
    StorageModule,
    MqModule,
    JobsModule,
    HealthModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class AppModule {}