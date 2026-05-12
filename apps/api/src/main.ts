import "reflect-metadata";

import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { ApiKeyGuard } from "./auth";
import { ConfigService } from "./config/config.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const config = app.get(ConfigService);
  app.enableCors({ origin: config.corsOrigins });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new ApiKeyGuard(config, reflector));

  const swaggerConfig = new DocumentBuilder()
    .setTitle("FrameForge API")
    .setDescription("Event-driven media processing platform")
    .setVersion("0.1.0")
    .addApiKey({ type: "apiKey", name: "X-API-Key", in: "header" }, "api-key")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(config.port);
}

void bootstrap();
