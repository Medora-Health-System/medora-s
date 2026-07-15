import { describe, expect, it } from "vitest";
import {
  buildClinicalOnsetApiPayload,
  defaultClinicalOnsetValue,
  isClinicalOnsetComplete,
} from "./clinicalOnsetModel";

describe("clinicalOnsetModel", () => {
  it("defaults to unknown", () => {
    expect(defaultClinicalOnsetValue().choice).toBe("UNKNOWN");
    expect(isClinicalOnsetComplete(defaultClinicalOnsetValue())).toBe(true);
  });

  it("builds unknown payload as null onset", () => {
    expect(buildClinicalOnsetApiPayload({ choice: "UNKNOWN" })).toEqual({
      onsetDate: null,
      onsetPrecision: "UNKNOWN",
    });
  });

  it("requires date for custom date", () => {
    expect(isClinicalOnsetComplete({ choice: "CUSTOM_DATE" })).toBe(false);
    expect(isClinicalOnsetComplete({ choice: "CUSTOM_DATE", dateLocal: "2026-07-14" })).toBe(true);
  });

  it("blocks future custom datetime", () => {
    const result = buildClinicalOnsetApiPayload(
      { choice: "CUSTOM_DATETIME", dateLocal: "2099-01-01", timeLocal: "10:00" },
      new Date("2026-07-14T12:00:00.000Z")
    );
    expect(result).toEqual({ error: "future" });
  });

  it("stores now as datetime precision", () => {
    const now = new Date("2026-07-14T21:08:00.000Z");
    expect(buildClinicalOnsetApiPayload({ choice: "NOW" }, now)).toEqual({
      onsetDate: now.toISOString(),
      onsetPrecision: "DATETIME",
    });
  });
});
