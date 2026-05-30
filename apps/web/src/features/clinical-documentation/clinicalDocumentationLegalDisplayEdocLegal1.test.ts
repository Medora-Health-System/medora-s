import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  NG_OG_TUBE_MONITORING_CARD_ID,
  ensureClinicalDocumentationLegalDisplaySummary,
  selectClinicalDocumentationPayloadSummary,
} from "@medora/shared";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation legal display (EDOC.LEGAL.1 web)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const edSummary = readFileSync(
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

  it("hub recent saved documentation uses legal summary selector", () => {
    expect(hub).toContain("selectClinicalDocumentationPayloadSummary");
    expect(hub).toContain("clinical-documentation-saved-entries");
  });

  it("ED visit summary renders clinicalDocumentationEntries", () => {
    expect(edSummary).toContain("clinicalDocumentationEntries");
    expect(edSummary).toContain("selectClinicalDocumentationPayloadSummary");
  });

  it("patient chart tabs and print layout include clinical documentation entries", () => {
    expect(chartTabs).toContain("clinicalDocumentationEntries");
    expect(chartTabs).toContain("selectClinicalDocumentationPayloadSummary");
    expect(printLayout).toContain("clinicalDocumentationEntries");
    expect(printLayout).toContain("selectClinicalDocumentationPayloadSummary");
  });

  it("chart and clinical documentation API types expose bilingual summaries and patientId", () => {
    expect(chartApi).toContain("payloadSummaryEn");
    expect(chartApi).toContain("payloadSummaryFr");
    expect(chartApi).toContain("patientId");
    expect(clinicalDocApi).toContain("payloadSummaryEn");
    expect(clinicalDocApi).toContain("payloadSummaryFr");
    expect(clinicalDocApi).toContain("patientId");
  });

  it("NG/OG legal display summary is never empty", () => {
    const payload = {
      assessmentTime: "2026-05-28T14:00:00.000Z",
      tubeType: "NG",
      placementVerified: "YES",
      markingAtNares: "22 cm",
      suctionActive: "NO",
      drainagePresent: "YES",
      drainageAppearance: "CLEAR",
      providerNotified: "NO",
    };
    const en = ensureClinicalDocumentationLegalDisplaySummary(
      NG_OG_TUBE_MONITORING_CARD_ID,
      payload,
      "en"
    );
    expect(en.some((l) => l.key === "Tube type")).toBe(true);
    const fr = selectClinicalDocumentationPayloadSummary(
      { cardId: NG_OG_TUBE_MONITORING_CARD_ID, payloadJson: payload },
      "fr"
    );
    expect(fr.length).toBeGreaterThan(0);
    expect(fr.some((l) => l.key === "Type de sonde" || l.key === "Type de documentation")).toBe(true);
  });

  it("empty card-specific summary uses fallback instead of disappearing", () => {
    const lines = selectClinicalDocumentationPayloadSummary(
      { cardId: "legacy_hidden_card", payloadJson: { a: 1, b: 2 } },
      "en"
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => l.key === "Payload fields" && l.value === "2")).toBe(true);
  });
});
