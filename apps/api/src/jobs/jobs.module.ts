import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Job } from "@frameforge/shared";

import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { MetricsService } from "../metrics";

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  controllers: [JobsController],
  providers: [JobsService, MetricsService],
})
export class JobsModule {}
