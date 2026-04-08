import { randomUUID } from "node:crypto";

import { Body, Controller, Get, Param, Post } from "@nestjs/common";

type CreateJobRequest = {
  mediaType: "image" | "video";
  profile: string;
};

@Controller("jobs")
export class JobsController {
  @Post()
  createJob(@Body() body: CreateJobRequest): {
    id: string;
    status: string;
    mediaType: string;
    profile: string;
  } {
    return {
      id: randomUUID(),
      status: "queued",
      mediaType: body.mediaType,
      profile: body.profile,
    };
  }

  @Get(":id")
  getJob(@Param("id") id: string): { id: string; status: string } {
    return {
      id,
      status: "queued",
    };
  }
}
