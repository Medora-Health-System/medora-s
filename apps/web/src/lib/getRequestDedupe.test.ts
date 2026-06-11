import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGetDedupeKey,
  dedupeGetRequest,
  resetGetRequestDedupeForTests,
} from "@/lib/getRequestDedupe";

describe("getRequestDedupe", () => {
  beforeEach(() => {
    resetGetRequestDedupeForTests();
    vi.useRealTimers();
  });

  it("reuses in-flight GET for concurrent callers", async () => {
    let resolve!: (value: string) => void;
    const fn = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        })
    );
    const key = buildGetDedupeKey("/encounters/enc-1/triage", "fac-1");
    const first = dedupeGetRequest(key, fn);
    const second = dedupeGetRequest(key, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    resolve("ok");
    await expect(first).resolves.toBe("ok");
    await expect(second).resolves.toBe("ok");
  });

  it("returns cached GET result within TTL without refetch", async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async () => "payload");
    const key = buildGetDedupeKey("/encounters/enc-1/orders", "fac-1");
    await dedupeGetRequest(key, fn);
    await dedupeGetRequest(key, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5_000);
    await dedupeGetRequest(key, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(6_000);
    await dedupeGetRequest(key, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
