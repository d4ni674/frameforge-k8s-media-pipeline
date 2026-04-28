import { Job, type ProcessingProfile } from "@frameforge/shared";

import { StorageService } from "../storage/storage.service";
import {
  generateThumbnail,
  generateResized,
  generateWebp,
} from "../transforms";
import { NonRetryableError } from "./errors";

export interface ProcessorResult {
  outputManifest: Record<string, string>;
}

export class JobProcessor {
  constructor(private storage: StorageService) {}

  async process(job: Job): Promise<ProcessorResult> {
    if (job.status === "done") {
      return { outputManifest: job.outputManifest ?? {} };
    }

    const sourceBuffer = await this.storage.download(job.sourceObjectKey);

    const profile = job.processingProfile as ProcessingProfile;

    switch (profile) {
      case "thumbnail": {
        const result = await generateThumbnail(sourceBuffer, job.id);
        await this.storage.upload(
          result.objectKey,
          result.data,
          result.data.length,
          result.contentType,
        );
        return { outputManifest: { thumbnail: result.objectKey } };
      }
      case "resized-800": {
        const result = await generateResized(sourceBuffer, job.id);
        await this.storage.upload(
          result.objectKey,
          result.data,
          result.data.length,
          result.contentType,
        );
        return { outputManifest: { "resized-800": result.objectKey } };
      }
      case "webp": {
        const result = await generateWebp(sourceBuffer, job.id);
        await this.storage.upload(
          result.objectKey,
          result.data,
          result.data.length,
          result.contentType,
        );
        return { outputManifest: { webp: result.objectKey } };
      }
      default:
        throw new NonRetryableError(
          `Unsupported processing profile: ${profile}`,
        );
    }
  }
}