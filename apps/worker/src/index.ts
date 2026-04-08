import pino from "pino";

const logger = pino({ name: "frameforge-worker" });

const queueName = process.env.RABBITMQ_QUEUE ?? "media.jobs";

logger.info("Worker bootstrap started");
logger.info({ queueName }, "Worker is ready and waiting for jobs");

setInterval(() => {
  logger.debug("Worker heartbeat");
}, 30000);
