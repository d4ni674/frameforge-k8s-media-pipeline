import type * as amqp from "amqplib";

import { MEDIA_DLQ, MEDIA_QUEUE, MEDIA_RETRY_QUEUE } from "../types/job-message";

export async function setupQueues(channel: amqp.Channel): Promise<void> {
  await channel.assertQueue(MEDIA_DLQ, { durable: true });

  await channel.assertQueue(MEDIA_RETRY_QUEUE, {
    durable: true,
    arguments: {
      "x-message-ttl": 30000,
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": MEDIA_QUEUE,
    },
  });

  await channel.assertQueue(MEDIA_QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": MEDIA_RETRY_QUEUE,
    },
  });
}
