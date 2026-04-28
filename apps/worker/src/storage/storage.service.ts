import * as Minio from "minio";

export interface StorageConfig {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSsl: boolean;
}

export class StorageService {
  private client: Minio.Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.client = new Minio.Client({
      endPoint: config.endpoint,
      port: config.port,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      useSSL: config.useSsl,
    });
    this.bucket = config.bucket;
  }

  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async upload(objectKey: string, data: Buffer, size: number, contentType: string): Promise<void> {
    await this.client.putObject(this.bucket, objectKey, data, size, {
      "Content-Type": contentType,
    });
  }

  async download(objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  }
}
