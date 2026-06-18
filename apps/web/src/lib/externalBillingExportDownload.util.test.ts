import { describe, expect, it } from "vitest";
import {
  buildExternalBillingDailyCertifiedExportPath,
  buildExternalBillingDailyExportPath,
  buildExternalBillingEncounterExportPath,
  buildExternalBillingWeeklyCertifiedExportPath,
  filenameFromContentDisposition,
} from "./externalBillingExportDownload.util";

describe("externalBillingExportDownload.util paths", () => {
  it("buildExternalBillingEncounterExportPath encodes id and format", () => {
    expect(buildExternalBillingEncounterExportPath("abc-123", "json")).toBe(
      "/billing/external/encounters/abc-123/export?format=json"
    );
    expect(buildExternalBillingEncounterExportPath("x/y", "csv")).toBe(
      "/billing/external/encounters/x%2Fy/export?format=csv"
    );
  });

  it("buildExternalBillingDailyExportPath includes date and format", () => {
    expect(buildExternalBillingDailyExportPath("2026-05-14", "json")).toBe(
      "/billing/external/daily-export?date=2026-05-14&format=json"
    );
  });

  it("certified daily and weekly export paths", () => {
    expect(buildExternalBillingDailyCertifiedExportPath("2026-05-14", "csv")).toBe(
      "/billing/external-export/daily.csv?date=2026-05-14"
    );
    expect(buildExternalBillingWeeklyCertifiedExportPath("2026-06-02", "json")).toBe(
      "/billing/external-export/weekly.json?weekStart=2026-06-02"
    );
  });
});

describe("filenameFromContentDisposition", () => {
  it("returns fallback when header missing", () => {
    expect(filenameFromContentDisposition(null, "fallback.csv")).toBe("fallback.csv");
  });

  it("parses quoted filename", () => {
    expect(
      filenameFromContentDisposition('attachment; filename="my-export.csv"', "fallback.csv")
    ).toBe("my-export.csv");
  });

  it("parses RFC5987 filename*", () => {
    const cd = "attachment; filename*=UTF-8''external-billing-daily-2026-01-02.csv";
    expect(filenameFromContentDisposition(cd, "fallback.csv")).toBe("external-billing-daily-2026-01-02.csv");
  });
});
