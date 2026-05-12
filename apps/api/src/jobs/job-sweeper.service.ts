import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { Interval } from "@nestjs/schedule";

import { Job, type JobMessage } from "@frameforge/shared";

import { MqService } from "../mq/mq.service";

const STUCK_THRESHOLD_MINUTES = 5;

@Injectable()
export class JobSweeperService {
  private readonly logger = new Logger(JobSweeperService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly mq: MqService,
  ) {}

  @Interval(60000)
  async sweepStuckJobs(): Promise<void> {
    const threshold = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);

    const stuckJobs = await this.jobRepo.find({
      where: {
        status: "queued",
        attemptCount: 0,
        createdAt: LessThan(threshold),
      },
    });

    if (stuckJobs.length === 0) return;

    this.logger.warn(`Found ${stuckJobs.length} stuck job(s), re-publishing to queue`);

    for (const job of stuckJobs) {
      const message: JobMessage = {
        jobId: job.id,
        mediaType: job.mediaType,
        processingProfile: job.processingProfile,
        processingVersion: job.processingVersion,
        sourceObjectKey: job.sourceObjectKey,
        createdAt: job.createdAt.toISOString(),
      };

      try {
        await this.mq.publish(message);
        this.logger.log(`Re-published stuck job ${job.id}`);
      } catch (err) {
        this.logger.error(`Failed to re-publish stuck job ${job.id}: ${(err as Error).message}`);
      }
    }
  }
}
