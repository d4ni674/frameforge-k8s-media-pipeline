import { IsEnum, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

import type { MediaType, ProcessingProfile } from "@frameforge/shared";

export class CreateJobDto {
  @ApiProperty({ enum: ["image", "video"], description: "Type of media to process" })
  @IsEnum(["image", "video"])
  mediaType!: MediaType;

  @ApiProperty({
    enum: ["thumbnail", "resized-800", "webp"],
    description: "Processing profile to apply",
  })
  @IsIn(["thumbnail", "resized-800", "webp"])
  processingProfile!: ProcessingProfile;
}
