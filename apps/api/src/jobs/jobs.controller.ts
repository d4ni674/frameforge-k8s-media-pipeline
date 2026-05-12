import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiConsumes, ApiQuery } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { CreateJobDto } from "./dto/create-job.dto";
import { JobsService } from "./jobs.service";
import { validateFileMagic } from "./file-magic";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

@ApiTags("jobs")
@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: "Upload a media file and create a processing job" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async createJob(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: CreateJobDto,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    if (!validateFileMagic(file.buffer, file.mimetype)) {
      throw new BadRequestException("File content does not match declared type");
    }

    if (body.mediaType !== "image") {
      throw new BadRequestException("Only image processing is supported in MVP");
    }

    return this.jobsService.create(file, body.mediaType, body.processingProfile);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get full job details" })
  async getJob(@Param("id") id: string) {
    return this.jobsService.findById(id);
  }

  @Get(":id/status")
  @ApiOperation({ summary: "Get lightweight job status" })
  async getJobStatus(@Param("id") id: string) {
    return this.jobsService.findStatus(id);
  }

  @Get()
  @ApiOperation({ summary: "List jobs with pagination and optional status filter" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, type: String })
  async listJobs(
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("status") status?: string,
  ) {
    return this.jobsService.findAll(page ?? 1, limit ?? 20, status);
  }
}
