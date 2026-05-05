import { Job, type ProcessingProfile } from "@frameforge/shared";

import { StorageService } from "../storage/storage.service";
import {
  generateThumbnail,
  generateResized,
  generateWebp,
  type TransformResult,
} from "../transforms";
import { NonRetryableError } from "./errors";

export interface ProcessorResult {
  outputManifest: Record<string, string>;
}

const PROFILE_KEY: Record<ProcessingProfile, string> = {
  thumbnail: "thumbnail",
  "resized-800": "resized-800",
  webp: "webp",
};

export class JobProcessor {
  constructor(private storage: StorageService) {}

  async process(job: Job): Promise<ProcessorResult> {
    const sourceBuffer = await this.storage.download(job.sourceObjectKey);
    const profile = job.processingProfile as ProcessingProfile;

    let result: TransformResult;
    switch (profile) {
      case "thumbnail":
        result = await generateThumbnail(sourceBuffer, job.id);
        break;
      case "resized-800":
        result = await generateResized(sourceBuffer, job.id);
        break;
      case "webp":
        result = await generateWebp(sourceBuffer, job.id);
        break;
      default:
        throw new NonRetryableError(`Unsupported processing profile: ${profile}`);
    }

    await this.storage.upload(
      result.objectKey,
      result.data,
      result.data.length,
      result.contentType,
    );
    return { outputManifest: { [PROFILE_KEY[profile]]: result.objectKey } };
  }
}
