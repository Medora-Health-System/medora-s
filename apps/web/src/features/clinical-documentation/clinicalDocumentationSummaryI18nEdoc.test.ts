import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultLanguage } from "@/i18n/config";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation summary i18n (EDOC.I18N.1)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const summaryPanel = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyVisitSummaryPanel.tsx"),
    "utf8"
  );
  const chartTabs = readFileSync(
    join(webSrcRoot, "components/patient-chart/PatientChartClinicalTabs.tsx"),
    "utf8"
  );
  const printLayout = readFileSync(
    join(webSrcRoot, "components/patient-chart/PatientChartPrintLayout.tsx"),
    "utf8"
  );
  const chartApi = readFileSync(join(webSrcRoot, "lib/chartApi.ts"), "utf8");
  const clinicalDocApi = readFileSync(join(webSrcRoot, "lib/clinicalDocumentationApi.ts"), "utf8");

  it("ClinicalDocumentationHub selects localized saved summaries", () => {
    expect(hub).toContain("selectClinicalDocumentationPayloadSummary");
    expect(hub).toContain("locale");
    expect(hub).not.toMatch(/entry\.payloadSummary\.map/);
  });

  it("ED visit summary selects localized summaries", () => {
    expect(summaryPanel).toContain("selectClinicalDocumentationPayloadSummary");
    expect(summaryPanel).toContain('language === "en" ? "en" : "fr"');
    expect(summaryPanel).not.toContain("entry.payloadSummary ?? []");
  });

  it("Patient chart tabs select localized summaries", () => {
    expect(chartTabs).toContain("selectClinicalDocumentationPayloadSummary");
    expect(chartTabs).not.toMatch(/entry\.payloadSummary \?\? \[\]\)\.map/);
  });

  it("Print layout selects localized summaries", () => {
    expect(printLayout).toContain("selectClinicalDocumentationPayloadSummary");
    expect(printLayout).toContain('lang === "en" ? "en" : "fr"');
  });

  it("API types expose bilingual payload summaries", () => {
    expect(clinicalDocApi).toContain("payloadSummaryEn");
    expect(clinicalDocApi).toContain("payloadSummaryFr");
    expect(chartApi).toContain("payloadSummaryEn");
    expect(chartApi).toContain("payloadSummaryFr");
  });

  it("login/default language fallback is English", () => {
    expect(defaultLanguage).toBe("en");
    expect(
      resolveClientUiLanguage({
        storedLanguage: null,
        facilityLanguage: null,
        cachedFacilityLanguage: null,
        browserLanguage: null,
      })
    ).toBe("en");
  });

  it("facility English overrides browser French when no stored preference", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: null,
        facilityLanguage: "en",
        cachedFacilityLanguage: "fr",
        browserLanguage: "fr",
      })
    ).toBe("en");
  });
});
