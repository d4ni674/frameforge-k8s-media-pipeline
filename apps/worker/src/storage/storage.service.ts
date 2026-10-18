import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export interface StorageConfig {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSsl: boolean;
}

export class StorageService {
  private client: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.client = new S3Client({
      endpoint: `${config.useSsl ? "https" : "http"}://${config.endpoint}:${config.port}`,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
    this.bucket = config.bucket;
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      const s3Error = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        s3Error.name !== "NotFound" &&
        s3Error.name !== "NoSuchBucket" &&
        s3Error.$metadata?.httpStatusCode !== 404
      ) {
        throw error;
      }
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async upload(objectKey: string, data: Buffer, size: number, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: data,
        ContentLength: size,
        ContentType: contentType,
      }),
    );
  }

  async download(objectKey: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
    if (!result.Body) {
      throw new Error(`Object ${objectKey} returned no body`);
    }
    return Buffer.from(await result.Body.transformToByteArray());
  }
}
