import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckService, TypeOrmHealthIndicator } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { RabbitMQHealthIndicator } from "./rabbitmq.health.indicator";

describe("HealthController", () => {
  let controller: HealthController;

  const mockHealthCheckService = {
    check: jest.fn().mockResolvedValue({ status: "ok", info: {}, error: {}, details: {} }),
  };

  const mockTypeOrm = {
    pingCheck: jest.fn().mockResolvedValue({ database: { status: "up" } }),
  };

  const mockRabbitMQ = {
    isHealthy: jest.fn().mockResolvedValue({ rabbitmq: { status: "up" } }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: mockTypeOrm },
        { provide: RabbitMQHealthIndicator, useValue: mockRabbitMQ },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should return health status", async () => {
    const result = await controller.check();
    expect(result.status).toBe("ok");
    expect(mockHealthCheckService.check).toHaveBeenCalled();
  });
});
