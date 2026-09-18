import "reflect-metadata";
import { ThrottlerGuard } from "@nestjs/throttler";
import { THROTTLER_LIMIT, THROTTLER_TTL } from "@nestjs/throttler";
import { AuthController } from "./auth.controller";

describe("Auth enterprise abuse controls", () => {
  it.each([
    ["login", 20, 60_000],
    ["refresh", 120, 60_000],
    ["forgotPassword", 5, 15 * 60_000],
    ["resetPassword", 10, 15 * 60_000],
    ["changePassword", 10, 15 * 60_000],
  ] as const)("%s has an explicit endpoint throttle", (method, limit, ttl) => {
    const handler = AuthController.prototype[method];
    const limits = Reflect.getMetadata(THROTTLER_LIMIT, handler);
    const ttls = Reflect.getMetadata(THROTTLER_TTL, handler);
    expect(limits?.default).toBe(limit);
    expect(ttls?.default).toBe(ttl);
    const guards = Reflect.getMetadata("__guards__", handler) ?? [];
    expect(guards).toContain(ThrottlerGuard);
  });
});
