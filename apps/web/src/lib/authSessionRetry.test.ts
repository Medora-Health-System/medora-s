import { describe, expect, it } from "vitest";
import {
  nextAuthTransientBackoffMs,
  AUTH_TRANSIENT_BACKOFF_MS,
  isTransientAuthFailureKind,
} from "./authSessionRetry";

describe("auth transient backoff", () => {
  it("uses bounded exponential delays with jitter", () => {
    expect(nextAuthTransientBackoffMs(0, () => 0)).toBe(AUTH_TRANSIENT_BACKOFF_MS[0]);
    expect(nextAuthTransientBackoffMs(1, () => 0)).toBe(AUTH_TRANSIENT_BACKOFF_MS[1]);
    expect(nextAuthTransientBackoffMs(2, () => 0)).toBe(AUTH_TRANSIENT_BACKOFF_MS[2]);
    expect(nextAuthTransientBackoffMs(5, () => 0)).toBe(AUTH_TRANSIENT_BACKOFF_MS[5]);
    expect(nextAuthTransientBackoffMs(99, () => 0)).toBe(AUTH_TRANSIENT_BACKOFF_MS[5]);
    const jittered = nextAuthTransientBackoffMs(0, () => 1);
    expect(jittered).toBeGreaterThan(AUTH_TRANSIENT_BACKOFF_MS[0]);
    expect(jittered).toBeLessThanOrEqual(AUTH_TRANSIENT_BACKOFF_MS[0] + AUTH_TRANSIENT_BACKOFF_MS[0] * 0.25);
  });

  it("does not classify 401 or 403 as transient infrastructure failures", () => {
    expect(isTransientAuthFailureKind("unavailable")).toBe(true);
    expect(isTransientAuthFailureKind("network")).toBe(true);
    expect(isTransientAuthFailureKind("timeout")).toBe(true);
    expect(isTransientAuthFailureKind("unauthenticated")).toBe(false);
    expect(isTransientAuthFailureKind("forbidden")).toBe(false);
  });
});

describe("auth transient backoff", () => {
  it("uses bounded exponential delays with jitter", () => {
    expect(nextAuthTransientBackoffMs(0, () => 0)).toBe(AUTH_TRANSIENT_BACKOFF_MS[0]);
    expect(nextAuthTransientBackoffMs(1, () => 0)).toBe(AUTH_TRANSIENT_BACKOFF_MS[1]);
    expect(nextAuthTransientBackoffMs(2, () => 0)).toBe(AUTH_TRANSIENT_BACKOFF_MS[2]);
    expect(nextAuthTransientBackoffMs(5, () => 0)).toBe(AUTH_TRANSIENT_BACKOFF_MS[5]);
    expect(nextAuthTransientBackoffMs(99, () => 0)).toBe(AUTH_TRANSIENT_BACKOFF_MS[5]);
    const jittered = nextAuthTransientBackoffMs(0, () => 1);
    expect(jittered).toBeGreaterThan(AUTH_TRANSIENT_BACKOFF_MS[0]);
    expect(jittered).toBeLessThanOrEqual(AUTH_TRANSIENT_BACKOFF_MS[0] + AUTH_TRANSIENT_BACKOFF_MS[0] * 0.25);
  });
});
