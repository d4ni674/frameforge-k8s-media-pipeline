import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as amqp from "amqplib";

import { ConfigService } from "../config/config.service";
import { MEDIA_QUEUE, setupQueues, type JobMessage } from "@frameforge/shared";

@Injectable()
export class MqService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.connection = await amqp.connect(this.config.rabbitmqUrl);
    this.channel = await this.connection.createChannel();

    await setupQueues(this.channel);
  }

  isConnected(): boolean {
    return this.channel !== null;
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async publish(message: JobMessage): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    this.channel.sendToQueue(MEDIA_QUEUE, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  }
}
