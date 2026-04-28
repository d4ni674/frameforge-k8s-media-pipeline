import pino from "pino";

import { MEDIA_QUEUE, MAX_ATTEMPTS, type JobMessage } from "@frameforge/shared";

import { createDataSource, JobRepository } from "./db";
import { MqConsumer } from "./mq";
import { JobProcessor, classifyError, NonRetryableError } from "./processor";
import { StorageService } from "./storage";
import {
  startMetricsServer,
  jobsStartedCounter,
  jobsCompletedCounter,
  jobsFailedCounter,
  processingDurationHistogram,
} from "./metrics";

const logger = pino({ name: "frameforge-worker" });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

async function main(): Promise<void> {
  logger.info("Worker starting up");

  const metricsPort = Number(process.env.METRICS_PORT ?? "9090");
  startMetricsServer(metricsPort, (msg) => logger.info(msg));

  const storage = new StorageService({
    endpoint: requireEnv("MINIO_ENDPOINT"),
    port: Number(process.env.MINIO_PORT ?? "9000"),
    accessKey: requireEnv("MINIO_ACCESS_KEY"),
    secretKey: requireEnv("MINIO_SECRET_KEY"),
    bucket: process.env.MINIO_BUCKET ?? "frameforge",
    useSsl: process.env.MINIO_USE_SSL === "true",
  });

  const dataSource = createDataSource({
    host: requireEnv("PG_HOST"),
    port: Number(process.env.PG_PORT ?? "5432"),
    user: requireEnv("PG_USER"),
    password: requireEnv("PG_PASSWORD"),
    database: requireEnv("PG_DATABASE"),
  });

  await dataSource.initialize();
  logger.info("Database connected");

  await storage.ensureBucket();
  logger.info("Storage bucket ensured");

  const jobRepo = new JobRepository(dataSource);
  const processor = new JobProcessor(storage);

  const consumer = new MqConsumer(requireEnv("RABBITMQ_URL"));
  await consumer.connect();
  logger.info({ queue: MEDIA_QUEUE }, "Connected to RabbitMQ");

  await consumer.consume(
    async (message: JobMessage): Promise<boolean> => {
      if (shuttingDown) {
        return false; // nack without requeue so another worker can pick it up
      }

      const processJob = async (): Promise<boolean> => {
        const { jobId, mediaType, processingProfile } = message;
        const log = logger.child({ jobId, mediaType, processingProfile });

        log.info("Processing job started");
        jobsStartedCounter.inc({ media_type: mediaType, profile: processingProfile });

        const startTime = Date.now();

        const job = await jobRepo.findById(jobId);
        if (!job) {
          log.error("Job not found in database");
          return true;
        }

        if (job.status === "done") {
          log.info("Job already completed, skipping (idempotency)");
          return true;
        }

        if (job.status === "failed" && job.attemptCount >= MAX_ATTEMPTS) {
          log.warn(
            { attemptCount: job.attemptCount },
            "Job already failed after max attempts, sending to DLQ",
          );
          await consumer.sendToDlq(message);
          return true;
        }

        await jobRepo.updateStatus(jobId, "processing", {
          startedAt: new Date(),
        });

        try {
          const result = await processor.process(job);

          await jobRepo.updateStatus(jobId, "done", {
            outputManifest: result.outputManifest,
            finishedAt: new Date(),
          });

          const durationMs = Date.now() - startTime;
          processingDurationHistogram.observe({ profile: processingProfile }, durationMs / 1000);
          jobsCompletedCounter.inc({ media_type: mediaType, profile: processingProfile });

          log.info({ durationMs }, "Job completed successfully");
          return true;
        } catch (rawError) {
          const classified = classifyError(rawError);
          const attemptCount = job.attemptCount + 1;
          const isNonRetryable = classified instanceof NonRetryableError;
          const maxAttemptsReached = attemptCount >= MAX_ATTEMPTS;

          if (isNonRetryable || maxAttemptsReached) {
            await jobRepo.updateStatus(jobId, "failed", {
              attemptCount,
              lastError: classified.message,
              finishedAt: new Date(),
            });

            jobsFailedCounter.inc({
              media_type: mediaType,
              reason: isNonRetryable ? "non_retryable" : "max_attempts",
            });

            if (maxAttemptsReached) {
              log.error(
                { error: classified.message, attemptCount },
                "Job failed after max attempts, sending to DLQ",
              );
              await consumer.sendToDlq(message);
            } else {
              log.error({ error: classified.message }, "Job failed permanently (non-retryable)");
            }

            return true;
          }

          await jobRepo.updateStatus(jobId, "queued", {
            attemptCount,
            lastError: classified.message,
            startedAt: null,
          });

          log.warn(
            { error: classified.message, attemptCount, maxAttempts: MAX_ATTEMPTS },
            "Job failed, will retry via dead-letter",
          );

          return false;
        }
      };

      const jobPromise = processJob();
      inFlightPromise = jobPromise.finally(() => {
        inFlightPromise = null;
      });

      return jobPromise;
    },
    (error) => logger.error({ error }, "Message processing error"),
  );

  logger.info("Worker is ready and waiting for jobs");

  let shuttingDown = false;
  let inFlightPromise: Promise<unknown> | null = null;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ signal }, "Received shutdown signal, starting graceful shutdown");

    // Stop accepting new messages
    await consumer.close();
    logger.info("Stopped consuming new messages");

    // Wait for in-flight job to complete (with timeout)
    if (inFlightPromise) {
      logger.info("Waiting for in-flight job to complete...");
      const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Shutdown timeout")), 30_000),
      );
      try {
        await Promise.race([inFlightPromise, timeout]);
        logger.info("In-flight job completed gracefully");
      } catch {
        logger.warn("Shutdown timeout reached, forcing exit");
      }
    }

    await dataSource.destroy();
    logger.info("Database connection closed");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  logger.fatal(
    { error: err instanceof Error ? err.message : String(err) },
    "Worker failed to start",
  );
  process.exit(1);
});
