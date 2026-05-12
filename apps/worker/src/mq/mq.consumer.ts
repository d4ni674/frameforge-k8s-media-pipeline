import * as amqp from "amqplib";

import { MEDIA_DLQ, MEDIA_QUEUE, setupQueues, type JobMessage } from "@frameforge/shared";

export class MqConsumer {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private url: string) {}

  async connect(prefetch = 1): Promise<void> {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();

    await setupQueues(this.channel);
    await this.channel.prefetch(prefetch);
  }

  async consume(
    handler: (message: JobMessage, originalMsg: amqp.ConsumeMessage) => Promise<boolean>,
    onError?: (error: unknown) => void,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    await this.channel.consume(
      MEDIA_QUEUE,
      async (msg) => {
        if (!msg) return;

        try {
          const body = JSON.parse(msg.content.toString()) as JobMessage;
          const shouldAck = await handler(body, msg);

          if (shouldAck) {
            this.channel!.ack(msg);
          } else {
            this.channel!.nack(msg, false, false);
          }
        } catch (error) {
          onError?.(error);
          this.channel!.nack(msg, false, false);
        }
      },
      { noAck: false },
    );
  }

  async sendToDlq(message: JobMessage): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    this.channel.sendToQueue(MEDIA_DLQ, Buffer.from(JSON.stringify(message)), { persistent: true });
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = null;
    this.connection = null;
  }
}
