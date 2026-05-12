import { ConfigService } from "./config.service";

describe("ConfigService", () => {
  let service: ConfigService;

  beforeEach(() => {
    process.env.PG_HOST = "localhost";
    process.env.PG_USER = "user";
    process.env.PG_PASSWORD = "pass";
    process.env.PG_DATABASE = "db";
    process.env.MINIO_ENDPOINT = "minio";
    process.env.MINIO_ACCESS_KEY = "key";
    process.env.MINIO_SECRET_KEY = "secret";
    process.env.RABBITMQ_URL = "amqp://localhost";
    service = new ConfigService();
  });

  afterEach(() => {
    delete process.env.PG_HOST;
    delete process.env.PG_USER;
    delete process.env.PG_PASSWORD;
    delete process.env.PG_DATABASE;
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
    delete process.env.RABBITMQ_URL;
  });

  it("should return configured values", () => {
    expect(service.pgHost).toBe("localhost");
    expect(service.pgPort).toBe(5432);
    expect(service.pgUser).toBe("user");
    expect(service.minioBucket).toBe("frameforge");
    expect(service.port).toBe(3000);
    expect(service.minioUseSsl).toBe(false);
    expect(service.apiKey).toBe("");
    expect(service.corsOrigins).toEqual(["*"]);
    expect(service.throttlerTtl).toBe(60000);
    expect(service.throttlerLimit).toBe(100);
  });

  it("should return configured CORS origins", () => {
    process.env.CORS_ORIGINS = "http://localhost:3000,https://example.com";
    const svc = new ConfigService();
    expect(svc.corsOrigins).toEqual(["http://localhost:3000", "https://example.com"]);
    delete process.env.CORS_ORIGINS;
  });

  it("should return configured API key", () => {
    process.env.API_KEY = "secret-key";
    const svc = new ConfigService();
    expect(svc.apiKey).toBe("secret-key");
    delete process.env.API_KEY;
  });

  it("should throw on missing required variable", () => {
    delete process.env.PG_HOST;
    expect(() => service.pgHost).toThrow("Missing required environment variable: PG_HOST");
  });
});
