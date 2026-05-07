import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";

import { IS_PUBLIC_KEY } from "./public.decorator";
import { ConfigService } from "../config/config.service";
import { Reflector } from "@nestjs/core";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.apiKey) {
      return true;
    }

    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler());
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];

    if (apiKey === this.config.apiKey) {
      return true;
    }

    throw new UnauthorizedException("Invalid or missing API key");
  }
}
