import "reflect-metadata";

import { Reflector } from "@nestjs/core";
import { UnauthorizedException } from "@nestjs/common";

import { ApiKeyGuard } from "./api-key.guard";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { ConfigService } from "../config/config.service";

describe("ApiKeyGuard", () => {
  let guard: ApiKeyGuard;
  let reflector: Reflector;

  const configuredConfig = { apiKey: "test-secret-key" } as Partial<ConfigService>;
  const unconfiguredConfig = { apiKey: "" } as Partial<ConfigService>;

  function createMockContext(headers: Record<string, string>, handler?: () => void): any {
    return {
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
      getHandler: () => handler ?? (() => {}),
    };
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new ApiKeyGuard(configuredConfig as ConfigService, reflector);
  });

  it("should allow access when API_KEY is not configured", () => {
    const unconfiguredGuard = new ApiKeyGuard(unconfiguredConfig as ConfigService, reflector);
    expect(unconfiguredGuard.canActivate(createMockContext({}))).toBe(true);
  });

  it("should allow access with valid API key", () => {
    expect(guard.canActivate(createMockContext({ "x-api-key": "test-secret-key" }))).toBe(true);
  });

  it("should deny access with invalid API key", () => {
    expect(() => guard.canActivate(createMockContext({ "x-api-key": "wrong-key" }))).toThrow(
      UnauthorizedException,
    );
  });

  it("should deny access with missing API key", () => {
    expect(() => guard.canActivate(createMockContext({}))).toThrow(UnauthorizedException);
  });

  it("should allow access to public endpoints without API key", () => {
    const handler = () => {};
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
    expect(guard.canActivate(createMockContext({}, handler))).toBe(true);
  });

  it("should allow access to public endpoints even with wrong API key", () => {
    const handler = () => {};
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
    expect(guard.canActivate(createMockContext({ "x-api-key": "wrong" }, handler))).toBe(true);
  });
});
