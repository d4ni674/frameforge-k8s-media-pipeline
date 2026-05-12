import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Job } from "@frameforge/shared";

import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { JobSweeperService } from "./job-sweeper.service";
import { MetricsService } from "../metrics";

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  controllers: [JobsController],
  providers: [JobsService, JobSweeperService, MetricsService],
})
export class JobsModule {}
