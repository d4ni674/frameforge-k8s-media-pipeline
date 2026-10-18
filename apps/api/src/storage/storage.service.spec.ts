import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

import { ConfigService } from "../config/config.service";
import { StorageService } from "./storage.service";

describe("API StorageService", () => {
  let service: StorageService;
  let send: jest.SpyInstance;

  beforeEach(() => {
    const config = {
      minioEndpoint: "localhost",
      minioPort: 9000,
      minioAccessKey: "key",
      minioSecretKey: "secret",
      minioUseSsl: false,
      minioBucket: "test-bucket",
    } as ConfigService;
    service = new StorageService(config);
    const client = (service as unknown as { client: S3Client }).client;
    send = jest.spyOn(client, "send");
  });

  it("checks bucket existence with a head request", async () => {
    send.mockResolvedValueOnce({} as never);

    await service.checkBucket();

    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
    expect(send.mock.calls[0][0].input).toEqual({ Bucket: "test-bucket" });
  });

  it("creates a bucket only when the endpoint returns not found", async () => {
    send
      .mockRejectedValueOnce({ name: "NoSuchBucket", $metadata: { httpStatusCode: 404 } })
      .mockResolvedValueOnce({} as never);

    await service.onModuleInit();

    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
    expect(send.mock.calls[1][0]).toBeInstanceOf(CreateBucketCommand);
  });

  it("uploads the body with its content metadata", async () => {
    send.mockResolvedValueOnce({} as never);
    const body = Buffer.from("image");

    await service.upload("images/1.webp", body, body.length, "image/webp");

    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: "test-bucket",
      Key: "images/1.webp",
      Body: body,
      ContentLength: body.length,
      ContentType: "image/webp",
    });
  });

  it("returns a readable stream for downloads", async () => {
    const body = Readable.from([Buffer.from("image")]);
    send.mockResolvedValueOnce({ Body: body } as never);

    await expect(service.download("images/1.webp")).resolves.toBe(body);
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
  });
});
