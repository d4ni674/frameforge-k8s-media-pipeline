import { StorageService } from "./storage.service";

describe("StorageService", () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService({
      endpoint: "localhost",
      port: 9000,
      accessKey: "key",
      secretKey: "secret",
      bucket: "test-bucket",
      useSsl: false,
    });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
