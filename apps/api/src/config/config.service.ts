import { Injectable } from "@nestjs/common";

@Injectable()
export class ConfigService {
  get(key: string): string | undefined {
    return process.env[key];
  }

  getOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  get pgHost(): string {
    return this.getOrThrow("PG_HOST");
  }

  get pgPort(): number {
    return Number(this.get("PG_PORT") ?? "5432");
  }

  get pgUser(): string {
    return this.getOrThrow("PG_USER");
  }

  get pgPassword(): string {
    return this.getOrThrow("PG_PASSWORD");
  }

  get pgDatabase(): string {
    return this.getOrThrow("PG_DATABASE");
  }

  get minioEndpoint(): string {
    return this.getOrThrow("MINIO_ENDPOINT");
  }

  get minioPort(): number {
    return Number(this.get("MINIO_PORT") ?? "9000");
  }

  get minioAccessKey(): string {
    return this.getOrThrow("MINIO_ACCESS_KEY");
  }

  get minioSecretKey(): string {
    return this.getOrThrow("MINIO_SECRET_KEY");
  }

  get minioBucket(): string {
    return this.get("MINIO_BUCKET") ?? "frameforge";
  }

  get minioUseSsl(): boolean {
    return this.get("MINIO_USE_SSL") === "true";
  }

  get rabbitmqUrl(): string {
    return this.getOrThrow("RABBITMQ_URL");
  }

  get port(): number {
    return Number(this.get("PORT") ?? "3000");
  }
}
