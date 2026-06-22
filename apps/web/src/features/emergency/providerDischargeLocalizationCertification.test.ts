import { describe, expect, it } from "vitest";
import {
  certifyDischargeLocalization,
  renderedDischargeNarrativeIsMonolingual,
  scanTemplateLocaleContamination,
} from "./providerDischargeLocalizationCertification";
import {
  CHEST_PAIN_SUGGESTED_TEXT,
  GENERIC_ED_DISCHARGE_SUGGESTED_TEXT,
} from "./providerDischargeTemplateSuggestedTextCatalog";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import { PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID } from "./providerDischargeTemplateRegistry";
import { PATIENT_SPECIFIC_DISCHARGE_RULES } from "./providerDischargePatientSpecificAdditions";
import { MEDICATION_RISK_DISCHARGE_RULES } from "./providerDischargeMedicationRiskRules";

describe("MEDUI.ED.DISCHARGE.I18N_CERTIFICATION.1", () => {
  it("01 — certifyDischargeLocalization runs full audit", () => {
    const report = certifyDischargeLocalization();
    expect(report.ticket).toBe("MEDUI.ED.DISCHARGE.I18N_REMEDIATION.1");
    expect(report.metrics.templatesAudited).toBe(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.length);
    expect(report.contentInventory.length).toBeGreaterThan(10);
  });

  it("02 — registry EN/FR coverage is 100%", () => {
    const report = certifyDischargeLocalization();
    expect(report.metrics.enCoveragePercent).toBe(100);
    expect(report.metrics.frCoveragePercent).toBe(100);
  });

  it("03 — chest pain template has no cross-language contamination", () => {
    const hits = scanTemplateLocaleContamination(
      "chest_pain_v1",
      CHEST_PAIN_SUGGESTED_TEXT.en,
      CHEST_PAIN_SUGGESTED_TEXT.fr
    );
    expect(hits).toHaveLength(0);
  });

  it("04 — generic template has full EN/FR required sections", () => {
    const generic = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID)!;
    for (const locale of ["en", "fr"] as const) {
      const body = getProviderDischargeSuggestedTextBody(generic, locale);
      expect(body.description.trim()).toBeTruthy();
      expect(body.diagnosisInstructions.trim()).toBeTruthy();
      expect(body.medicationTreatment.trim()).toBeTruthy();
      expect(body.returnPrecautions.trim()).toBeTruthy();
    }
  });

  it("05 — every patient-specific rule has EN and FR text", () => {
    for (const rule of PATIENT_SPECIFIC_DISCHARGE_RULES) {
      expect(rule.text.en?.trim(), rule.id).toBeTruthy();
      expect(rule.text.fr?.trim(), rule.id).toBeTruthy();
    }
  });

  it("06 — every medication risk rule has EN and FR text", () => {
    for (const rule of MEDICATION_RISK_DISCHARGE_RULES) {
      expect(rule.text.en?.trim(), rule.id).toBeTruthy();
      expect(rule.text.fr?.trim(), rule.id).toBeTruthy();
    }
  });

  it("07 — FR chest pain narrative is monolingual", () => {
    const fr = getProviderDischargeSuggestedTextBody(
      { id: "chest_pain_v1", suggestedText: CHEST_PAIN_SUGGESTED_TEXT },
      "fr"
    );
    const blob = [fr.description, fr.diagnosisInstructions, fr.returnPrecautions].join("\n");
    expect(renderedDischargeNarrativeIsMonolingual(blob, "fr")).toBe(true);
  });

  it("08 — EN chest pain narrative is monolingual", () => {
    const en = getProviderDischargeSuggestedTextBody(
      { id: "chest_pain_v1", suggestedText: CHEST_PAIN_SUGGESTED_TEXT },
      "en"
    );
    const blob = [en.description, en.diagnosisInstructions, en.returnPrecautions].join("\n");
    expect(renderedDischargeNarrativeIsMonolingual(blob, "en")).toBe(true);
  });

  it("09 — generic empty-label FR uses French fallback", () => {
    const report = certifyDischargeLocalization();
    expect(
      report.genericFallbackFindings.some((f) => f.id === "generic-fr-empty-label-en-fallback")
    ).toBe(false);
    expect(report.decision).toBe("I18N_READY");
  });

  it("10 — output surfaces pass monolingual scan for FR and EN samples", () => {
    const report = certifyDischargeLocalization();
    const outputFails = report.outputSurfaceFindings.filter((f) => f.severity === "FAIL");
    expect(outputFails).toHaveLength(0);
  });

  it("11 — documents generic placeholder localization structure", () => {
    expect(GENERIC_ED_DISCHARGE_SUGGESTED_TEXT.fr.description).toContain("[diagnosis]");
    expect(GENERIC_ED_DISCHARGE_SUGGESTED_TEXT.en.description).toContain("[diagnosis]");
  });

  it("12 — certification decision reflects blockers", () => {
    const report = certifyDischargeLocalization();
    if (report.blockers.length === 0) {
      expect(report.decision).toBe("I18N_READY");
    } else {
      expect(report.decision).toBe("I18N_NOT_READY");
    }
  });

  it("13 — follow-up timing registry fully mapped", () => {
    const report = certifyDischargeLocalization();
    expect(report.followUpTimingFindings.filter((f) => f.severity === "FAIL")).toHaveLength(0);
  });
});
