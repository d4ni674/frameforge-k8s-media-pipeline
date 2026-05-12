import { Injectable, OnModuleInit } from "@nestjs/common";
import * as Minio from "minio";
import type { Readable } from "stream";

import { ConfigService } from "../config/config.service";

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Minio.Client;

  constructor(private readonly config: ConfigService) {
    this.client = new Minio.Client({
      endPoint: config.minioEndpoint,
      port: config.minioPort,
      accessKey: config.minioAccessKey,
      secretKey: config.minioSecretKey,
      useSSL: config.minioUseSsl,
    });
  }

  async onModuleInit(): Promise<void> {
    const bucket = this.config.minioBucket;
    const exists = await this.client.bucketExists(bucket);
    if (!exists) {
      await this.client.makeBucket(bucket);
    }
  }

  async checkBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.config.minioBucket);
    if (!exists) {
      throw new Error(`Bucket ${this.config.minioBucket} does not exist`);
    }
  }

  async upload(
    objectKey: string,
    data: Buffer | Readable,
    size: number,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(this.config.minioBucket, objectKey, data, size, {
      "Content-Type": contentType,
    });
  }

  async download(objectKey: string): Promise<Readable> {
    return this.client.getObject(this.config.minioBucket, objectKey);
  }
}
