import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
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
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)?.length).toBeGreaterThan(0);
  });
});
