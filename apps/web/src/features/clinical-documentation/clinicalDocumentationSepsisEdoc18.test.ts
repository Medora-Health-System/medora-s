import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  calculateQsofaScore,
  calculateSirsCriteriaCount,
  deriveQsofaPositive,
  deriveSirsPositive,
  summarizeSepsisMonitoringDocumentationPayload,
  SEPSIS_SCREENING_CARD_ID,
} from "@medora/shared";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation sepsis monitoring (EDOC.18)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationSepsisMonitoringForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.18 sepsis form", () => {
    expect(hub).toContain("isEdoc18SepsisMonitoringDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationSepsisMonitoringForm");
  });

  it("form exposes screening, SIRS, qSOFA, bundle, lactate with dropdowns and compact layout", () => {
    expect(form).toContain("clinical-documentation-sepsis-form");
    expect(form).toContain("sepsis-screening-time");
    expect(form).toContain("SEPSIS_YES_NO_UNKNOWN_OPTIONS");
    expect(form).toContain("SEPSIS_SUSPECTED_SOURCE_OPTIONS");
    expect(form).toContain("SEPSIS_BUNDLE_TYPE_OPTIONS");
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain("validateSepsisMonitoringDocumentationPayloadForCard");
    expect(form).toContain("calculateSirsCriteriaCount");
    expect(form).toContain("calculateQsofaScore");
    expect(form).toContain("sirsCalculated");
    expect(form).toContain("qsofaCalculated");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
    expect(form).toContain('data-compact-layout="true"');
  });

  it("SIRS and qSOFA calculations are visible support only", () => {
    expect(calculateSirsCriteriaCount({
      temperatureCriteriaMet: "YES",
      heartRateCriteriaMet: "YES",
      respiratoryCriteriaMet: "NO",
      wbcCriteriaMet: "NO",
    })).toBe(2);
    expect(deriveSirsPositive(2)).toBe("YES");
    expect(
      calculateQsofaScore({
        respiratoryRateHigh: "YES",
        alteredMentation: "YES",
        systolicBpLow: "NO",
      })
    ).toBe(2);
    expect(deriveQsofaPositive(2)).toBe("YES");
  });

  it("bilingual sepsis form keys mirrored", () => {
    expect(en).toContain("sepsisMonitoring:");
    expect(fr).toContain("sepsisMonitoring:");
    expect(en).toContain("sirsCalculated:");
    expect(fr).toContain("sirsCalculated:");
    expect(en).toContain("qsofaCalculated:");
    expect(fr).toContain("qsofaCalculated:");
    expect(en).toContain("antibioticsDocumentedInMar:");
    expect(fr).toContain("antibioticsDocumentedInMar:");
  });

  it("EN and FR summaries render without diagnosis language", () => {
    const payload = {
      screeningTime: "2026-05-28T14:00:00.000Z",
      suspectedInfection: "YES",
      temperatureAbnormal: "YES",
      heartRateAbnormal: "YES",
      respiratoryRateAbnormal: "NO",
      wbcAbnormalOrUnknown: "NO",
      alteredMentalStatus: "NO",
      hypotensionPresent: "NO",
      lactateConcern: "NO",
      screenPositive: "YES",
      providerNotified: "YES",
      providerNotificationTime: "2026-05-28T14:05:00.000Z",
    };
    const enSummary = summarizeSepsisMonitoringDocumentationPayload(
      SEPSIS_SCREENING_CARD_ID,
      payload,
      "en"
    );
    const frSummary = summarizeSepsisMonitoringDocumentationPayload(
      SEPSIS_SCREENING_CARD_ID,
      payload,
      "fr"
    );
    expect(enSummary.some((l) => l.key === "Screen positive")).toBe(true);
    expect(frSummary.some((l) => l.key === "Dépistage positif")).toBe(true);
    expect(JSON.stringify(enSummary)).not.toMatch(/patient has sepsis|diagnosis confirmed/i);
    expect(JSON.stringify(frSummary)).not.toMatch(/sepsis confirmé|diagnostic confirmé/i);
  });
});
