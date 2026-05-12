import { EventEmitter } from "events";
import * as amqp from "amqplib";
import { MqService } from "./mq.service";
import { ConfigService } from "../config/config.service";

jest.mock("amqplib");

const mockedAmqp = jest.mocked(amqp);

function createMockChannel(): amqp.Channel & EventEmitter {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    assertQueue: jest.fn().mockResolvedValue(undefined),
    sendToQueue: jest.fn().mockReturnValue(true),
    checkQueue: jest
      .fn()
      .mockResolvedValue({ queue: "media.jobs", messageCount: 0, consumerCount: 0 }),
    close: jest.fn().mockResolvedValue(undefined),
    prefetch: jest.fn().mockResolvedValue(undefined),
  }) as unknown as amqp.Channel & EventEmitter;
}

function createMockConnection(channel: amqp.Channel): amqp.ChannelModel & EventEmitter {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    createChannel: jest.fn().mockResolvedValue(channel),
    close: jest.fn().mockResolvedValue(undefined),
  }) as unknown as amqp.ChannelModel & EventEmitter;
}

describe("MqService", () => {
  let service: MqService;

  const mockConfig = { rabbitmqUrl: "amqp://localhost" } as Partial<ConfigService>;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new MqService(mockConfig as ConfigService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("should connect on module init", async () => {
    const channel = createMockChannel();
    const connection = createMockConnection(channel);
    mockedAmqp.connect.mockResolvedValue(connection);

    await service.onModuleInit();

    expect(service.isConnected()).toBe(true);
    expect(mockedAmqp.connect).toHaveBeenCalledWith("amqp://localhost");
  });

  it("should publish messages when connected", async () => {
    const channel = createMockChannel();
    const connection = createMockConnection(channel);
    mockedAmqp.connect.mockResolvedValue(connection);

    await service.onModuleInit();

    await service.publish({
      jobId: "test-id",
      mediaType: "image",
      processingProfile: "thumbnail",
      processingVersion: 1,
      sourceObjectKey: "originals/test-id/source",
      createdAt: new Date().toISOString(),
    });

    expect(channel.sendToQueue).toHaveBeenCalled();
  });

  it("should throw when publishing while disconnected", async () => {
    await expect(
      service.publish({
        jobId: "test-id",
        mediaType: "image",
        processingProfile: "thumbnail",
        processingVersion: 1,
        sourceObjectKey: "originals/test-id/source",
        createdAt: new Date().toISOString(),
      }),
    ).rejects.toThrow("RabbitMQ channel not available");
  });

  it("should reconnect on connection close", async () => {
    const channel1 = createMockChannel();
    const connection1 = createMockConnection(channel1);
    const channel2 = createMockChannel();
    const connection2 = createMockConnection(channel2);

    mockedAmqp.connect.mockResolvedValueOnce(connection1).mockResolvedValueOnce(connection2);

    await service.onModuleInit();
    expect(service.isConnected()).toBe(true);

    // Simulate connection close
    connection1.emit("close");
    expect(service.isConnected()).toBe(false);

    // Run pending timers (reconnect) and flush microtasks
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockedAmqp.connect).toHaveBeenCalledTimes(2);
    expect(service.isConnected()).toBe(true);
  });

  it("should check queue when connected", async () => {
    const channel = createMockChannel();
    const connection = createMockConnection(channel);
    mockedAmqp.connect.mockResolvedValue(connection);

    await service.onModuleInit();
    await service.checkQueue();

    expect(channel.checkQueue).toHaveBeenCalledWith("media.jobs");
  });

  it("should throw on checkQueue when disconnected", async () => {
    await expect(service.checkQueue()).rejects.toThrow("RabbitMQ channel not available");
  });

  it("should give up reconnecting after max attempts", async () => {
    mockedAmqp.connect.mockRejectedValue(new Error("Connection refused"));

    await service.onModuleInit();
    expect(service.isConnected()).toBe(false);

    // Simulate multiple reconnect attempts
    for (let i = 0; i < 15; i++) {
      jest.advanceTimersByTime(60000);
      await Promise.resolve();
    }

    // Should stop trying after MAX_RECONNECT_ATTEMPTS (10)
    expect(mockedAmqp.connect).toHaveBeenCalledTimes(11); // initial + 10 retries
  });
});
