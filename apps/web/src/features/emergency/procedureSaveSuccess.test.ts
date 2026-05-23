import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  PROCEDURE_SAVE_SUCCESS_CLOSE_MS,
  afterProcedureDocumentSaveSuccess,
} from "./procedureSaveSuccess";

describe("procedureSaveSuccess", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onRecorded immediately and onClose after the configured delay", async () => {
    const onRecorded = vi.fn();
    const onClose = vi.fn();

    const promise = afterProcedureDocumentSaveSuccess({ onRecorded, onClose });
    expect(onRecorded).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(PROCEDURE_SAVE_SUCCESS_CLOSE_MS - 1);
    expect(onClose).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses a delay between 800ms and 1200ms", () => {
    expect(PROCEDURE_SAVE_SUCCESS_CLOSE_MS).toBeGreaterThanOrEqual(800);
    expect(PROCEDURE_SAVE_SUCCESS_CLOSE_MS).toBeLessThanOrEqual(1200);
  });
});
