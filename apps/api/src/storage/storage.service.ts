import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";

import { ConfigService } from "../config/config.service";

@Injectable()
export class StorageService implements OnModuleInit {
  private client: S3Client;

  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      endpoint: `${config.minioUseSsl ? "https" : "http"}://${config.minioEndpoint}:${config.minioPort}`,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.minioAccessKey,
        secretAccessKey: config.minioSecretKey,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.checkBucket();
    } catch (error) {
      const s3Error = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        s3Error.name !== "NotFound" &&
        s3Error.name !== "NoSuchBucket" &&
        s3Error.$metadata?.httpStatusCode !== 404
      ) {
        throw error;
      }
      await this.client.send(new CreateBucketCommand({ Bucket: this.config.minioBucket }));
    }
  }

  async checkBucket(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.config.minioBucket }));
  }

  async upload(
    objectKey: string,
    data: Buffer | Readable,
    size: number,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.minioBucket,
        Key: objectKey,
        Body: data,
        ContentLength: size,
        ContentType: contentType,
      }),
    );
  }

  async download(objectKey: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.minioBucket, Key: objectKey }),
    );
    if (!result.Body || !("pipe" in result.Body)) {
      throw new Error(`Object ${objectKey} returned no readable body`);
    }
    return result.Body as Readable;
  }
}
