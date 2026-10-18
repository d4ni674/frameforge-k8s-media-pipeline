import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { StorageService } from "./storage.service";

describe("StorageService", () => {
  let service: StorageService;
  let send: jest.SpyInstance;

  beforeEach(() => {
    service = new StorageService({
      endpoint: "localhost",
      port: 9000,
      accessKey: "key",
      secretKey: "secret",
      bucket: "test-bucket",
      useSsl: false,
    });
    const client = (service as unknown as { client: S3Client }).client;
    send = jest.spyOn(client, "send");
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("does not recreate an existing bucket", async () => {
    send.mockResolvedValueOnce({} as never);

    await service.ensureBucket();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
  });

  it("creates a bucket when the S3 endpoint reports it missing", async () => {
    send
      .mockRejectedValueOnce({ name: "NotFound", $metadata: { httpStatusCode: 404 } })
      .mockResolvedValueOnce({} as never);

    await service.ensureBucket();

    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
    expect(send.mock.calls[1][0]).toBeInstanceOf(CreateBucketCommand);
    expect(send.mock.calls[1][0].input).toEqual({ Bucket: "test-bucket" });
  });

  it("uploads an object with its content metadata", async () => {
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

  it("downloads an object body as a buffer", async () => {
    send.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) },
    } as never);

    await expect(service.download("images/1.webp")).resolves.toEqual(Buffer.from([1, 2, 3]));
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "test-bucket",
      Key: "images/1.webp",
    });
  });
});
