import { randomUUID, createHash } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Job, PROCESSING_VERSION, type JobMessage } from "@frameforge/shared";

import { StorageService } from "../storage/storage.service";
import { MqService } from "../mq/mq.service";
import { MetricsService } from "../metrics";

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly storage: StorageService,
    private readonly mq: MqService,
    private readonly metrics: MetricsService,
  ) {}

  async create(
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    mediaType: "image" | "video",
    processingProfile: "thumbnail" | "resized-800" | "webp",
  ): Promise<{ id: string; status: string; mediaType: string; processingProfile: string }> {
    const id = randomUUID();
    const sourceObjectKey = `originals/${id}/source`;
    const sourceHash = createHash("sha256").update(file.buffer).digest("hex");

    await this.storage.upload(sourceObjectKey, file.buffer, file.size, file.mimetype);

    const job = this.jobRepo.create({
      id,
      status: "queued",
      mediaType,
      processingProfile,
      processingVersion: PROCESSING_VERSION,
      sourceObjectKey,
      sourceHash,
      attemptCount: 0,
      lastError: null,
      outputManifest: null,
      startedAt: null,
      finishedAt: null,
    });

    await this.jobRepo.save(job);

    const message: JobMessage = {
      jobId: id,
      mediaType,
      processingProfile,
      processingVersion: PROCESSING_VERSION,
      sourceObjectKey,
      createdAt: job.createdAt.toISOString(),
    };

    await this.mq.publish(message);

    this.metrics.recordUpload(mediaType, processingProfile);
    this.metrics.recordJobCreated(mediaType, processingProfile);

    return {
      id: job.id,
      status: job.status,
      mediaType: job.mediaType,
      processingProfile: job.processingProfile,
    };
  }

  async findById(id: string): Promise<Job> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return job;
  }

  async findStatus(id: string): Promise<{ id: string; status: string }> {
    const job = await this.jobRepo.findOne({
      where: { id },
      select: ["id", "status"],
    });
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return job;
  }

  async findAll(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{ data: Job[]; total: number; page: number; limit: number }> {
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const cappedLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);

    const [data, total] = await this.jobRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (safePage - 1) * cappedLimit,
      take: cappedLimit,
    });

    return { data, total, page: safePage, limit: cappedLimit };
  }
}
