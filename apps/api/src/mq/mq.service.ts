import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as amqp from "amqplib";

import { ConfigService } from "../config/config.service";
import { MEDIA_QUEUE, setupQueues, type JobMessage } from "@frameforge/shared";

const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

@Injectable()
export class MqService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shuttingDown = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  isConnected(): boolean {
    return this.channel !== null;
  }

  async checkQueue(): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not available");
    }
    await this.channel.checkQueue(MEDIA_QUEUE);
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.channel?.close();
    await this.connection?.close();
    this.channel = null;
    this.connection = null;
  }

  async publish(message: JobMessage): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not available");
    }

    this.channel.sendToQueue(MEDIA_QUEUE, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  }

  private async connect(): Promise<void> {
    if (this.shuttingDown) return;

    try {
      this.connection = await amqp.connect(this.config.rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      await setupQueues(this.channel);

      this.reconnectAttempts = 0;

      this.connection.on("error", (err) => {
        this.scheduleReconnect(`Connection error: ${err.message}`);
      });
      this.connection.on("close", () => {
        this.scheduleReconnect("Connection closed");
      });
      this.channel.on("error", (err) => {
        this.scheduleReconnect(`Channel error: ${err.message}`);
      });
      this.channel.on("close", () => {
        this.scheduleReconnect("Channel closed");
      });
    } catch (err) {
      this.scheduleReconnect(`Connection failed: ${(err as Error).message}`);
    }
  }

  private scheduleReconnect(_reason: string): void {
    if (this.shuttingDown || this.reconnectTimer) return;

    this.channel = null;
    this.connection = null;

    this.reconnectAttempts++;
    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      // Will stay disconnected; health checks will fail alerting ops
      return;
    }

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY_MS,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }
}
