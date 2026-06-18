import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXTERNAL_BILLING_EXPORT_CSV_HEADERS } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../../..");
const apiRoot = join(import.meta.dirname, "../../../../api/src");

function readFile(relativePath: string, root = webRoot): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("externalBillingExportUi (MEDUI.BILLING.EXTERNAL_EXPORT.1)", () => {
  it("billing page renders daily and weekly export buttons", () => {
    const page = readFile("app/app/billing/page.tsx");
    expect(page).toContain("externalExportDownloadDailyJson");
    expect(page).toContain("externalExportDownloadDailyCsv");
    expect(page).toContain("externalExportDownloadWeeklyJson");
    expect(page).toContain("externalExportDownloadWeeklyCsv");
    expect(page).toContain("ExternalBillingExportCertificationPanel");
  });

  it("shows third-party helper text separate from internal readiness", () => {
    const page = readFile("app/app/billing/page.tsx");
    expect(page).toContain("externalExportThirdPartyHelper");
    expect(page).not.toContain("readinessFinalize");
  });

  it("no claim submission or billing mutation", () => {
    const page = readFile("app/app/billing/page.tsx");
    expect(page).not.toContain("submitClaim");
    expect(page).not.toContain("postPayment");
    expect(page).not.toContain('method: "POST"');
  });

  it("certification panel is read-only", () => {
    const panel = readFile("src/features/billing/ExternalBillingExportCertificationPanel.tsx");
    expect(panel).toContain("externalExportCertificationReady");
    expect(panel).not.toContain("submitClaim");
    expect(panel).not.toContain("<button");
  });

  it("EN and FR external export i18n keys exist", () => {
    const en = readFile("src/i18n/messages/en.ts");
    const fr = readFile("src/i18n/messages/fr.ts");
    for (const key of [
      "externalExportSectionTitle",
      "externalExportCertificationReadyWithWarnings",
      "externalExportDownloadWeeklyCsv",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });
});

describe("externalBillingExportCsvCompatibility (MEDUI.BILLING.EXTERNAL_EXPORT.1)", () => {
  it("CSV headers remain backward compatible", () => {
    const service = readFile("billing/external-billing-export.service.ts", apiRoot);
    expect(service).toContain("EXTERNAL_BILLING_EXPORT_CSV_HEADERS");
    expect(EXTERNAL_BILLING_EXPORT_CSV_HEADERS[0]).toBe("export_batch_id");
    expect(EXTERNAL_BILLING_EXPORT_CSV_HEADERS).toContain("encounter_id");
    expect(EXTERNAL_BILLING_EXPORT_CSV_HEADERS).toContain("clinical_payload_json");
    expect(EXTERNAL_BILLING_EXPORT_CSV_HEADERS.length).toBe(33);
  });

  it("legacy daily export path still exists", () => {
    const util = readFile("src/lib/externalBillingExportDownload.util.ts");
    expect(util).toContain("/billing/external/daily-export");
    expect(util).toContain("/billing/external-export/daily.json");
  });
});
