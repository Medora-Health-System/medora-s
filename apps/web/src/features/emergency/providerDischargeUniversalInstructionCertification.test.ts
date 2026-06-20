import { describe, expect, it } from "vitest";
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import {
  buildEdDischargeDiagnosisCatalog,
  auditEdDischargeDiagnosisCoverage,
} from "./edDischargeDiagnosisCatalog";
import {
  buildProviderDischargeCardFromDiagnosis,
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import {
  ADULT_FEVER_TEMPLATE_ID,
  PEDIATRIC_FEVER_TEMPLATE_ID,
} from "./providerDischargePediatricFeverAgePolicy";
import {
  buildCertificationFormForDiagnosis,
  buildFullIcdCatalogDischargeCoverageAudit,
  buildRepoCatalogCoverageReport,
  buildUniversalDischargeInstructionCoverageReport,
  certifyAutomaticDiagnosisInstructionApplication,
  certifyDischargeInstructionsForDiagnosis,
  certifyGenericFallbackHospitalGrade,
  certifyManualDiagnosisFallback,
  certifyUniversalOutputSurfaces,
  MANUAL_DIAGNOSIS_FALLBACK_CASES,
  UNIVERSAL_DIAGNOSIS_SOURCE_AUDIT,
} from "./providerDischargeUniversalInstructionCertification";
import {
  mergeProviderDischargeDocumentationIntoDischargeJson,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import {
  syncProviderDischargeCardWithRef,
} from "./providerDischargeCardTemplateSync";
import { loadIcd10DevSampleCatalog } from "./edDischargeCoverageAuditLevel2";

describe("MEDUI.ED.DISCHARGE.ALL_DIAGNOSES_HOSPITAL_GRADE.1", () => {
  describe("Phase 1 — diagnosis source audit", () => {
    it("01 — documents all major diagnosis sources", () => {
      expect(UNIVERSAL_DIAGNOSIS_SOURCE_AUDIT.length).toBeGreaterThanOrEqual(7);
      const sources = UNIVERSAL_DIAGNOSIS_SOURCE_AUDIT.map((r) => r.source);
      expect(sources.some((s) => s.includes("ED diagnosis picker"))).toBe(true);
      expect(sources.some((s) => s.includes("COMMON_DIAGNOSES") || s.includes("quick picks"))).toBe(true);
    });
  });

  describe("Phase 2 — universal resolution coverage", () => {
    it("02 — known ICD R11.2 gets specific instructions", () => {
      const row = certifyDischargeInstructionsForDiagnosis({
        code: "R11.2",
        displayName: "Nausea and vomiting",
        source: "test",
      });
      expect(row.status).toBe("HOSPITAL_GRADE_FAMILY");
      expect(row.templateId).toBe("nausea_vomiting_v1");
      expect(row.hasDescription).toBe(true);
      expect(row.hasInstructions).toBe(true);
      expect(row.hasMedicationTreatment).toBe(true);
      expect(row.hasReturnPrecautions).toBe(true);
      expect(row.hasFollowUp).toBe(true);
    });

    it("03 — unknown ICD Z99.99 gets generic fallback", () => {
      const row = certifyDischargeInstructionsForDiagnosis({
        code: "Z99.99",
        displayName: "Unknown test diagnosis",
        source: "test",
      });
      expect(row.status).toBe("HOSPITAL_GRADE_GENERIC");
      expect(row.templateId).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });

    it("04 — repo catalog coverage has zero FAIL rows", () => {
      const report = buildRepoCatalogCoverageReport();
      expect(report.failCount).toBe(0);
      expect(report.allHospitalGrade).toBe(true);
    });

    it("05 — every quick-pick diagnosis resolves with all fields", () => {
      for (const pick of COMMON_DIAGNOSES) {
        const row = certifyDischargeInstructionsForDiagnosis({
          code: pick.code,
          displayName: pick.label,
          source: "common_diagnosis",
        });
        expect(row.status.startsWith("HOSPITAL_GRADE_"), pick.code).toBe(true);
        expect(row.hasDescription, pick.code).toBe(true);
        expect(row.hasInstructions, pick.code).toBe(true);
        expect(row.hasMedicationTreatment, pick.code).toBe(true);
        expect(row.hasReturnPrecautions, pick.code).toBe(true);
        expect(row.hasFollowUp, pick.code).toBe(true);
      }
    });

    it("06 — every repo ICD sample row resolves", () => {
      const sample = loadIcd10DevSampleCatalog();
      expect(sample.length).toBeGreaterThan(0);
      const report = buildUniversalDischargeInstructionCoverageReport(
        sample.map((r) => ({ code: r.code, label: r.label, source: "repo_sample" }))
      );
      expect(report.failCount).toBe(0);
    });

    it("07 — no diagnosis produces blank discharge instructions", () => {
      const catalog = buildEdDischargeDiagnosisCatalog();
      for (const entry of catalog) {
        const card = buildProviderDischargeCardFromDiagnosis({
          sourceEncounterDiagnosisId: `dx-${entry.code}`,
          code: entry.code,
          displayName: entry.label,
          displayOrder: 0,
          isPrimaryDiagnosis: true,
          applyTemplateSuggestion: true,
          locale: "en",
        });
        expect(card.description.trim().length, entry.code).toBeGreaterThan(10);
        expect(card.diagnosisInstructions.trim().length, entry.code).toBeGreaterThan(10);
        expect(card.medicationTreatment.trim().length, entry.code).toBeGreaterThan(10);
      }
    });
  });

  describe("Phase 3 — generic fallback hospital-grade", () => {
    it("08 — generic fallback certification passes", () => {
      const cert = certifyGenericFallbackHospitalGrade("en");
      expect(cert.hospitalGrade).toBe(true);
      expect(cert.descriptionIncludesDiagnosisPlaceholder).toBe(true);
      expect(cert.medicationIncludesStopChangeGuard).toBe(true);
      expect(cert.followUpOneToTwoDays).toBe(true);
    });

    it("09 — generic fallback contains 1–2 day follow-up", () => {
      const cert = certifyGenericFallbackHospitalGrade("en");
      expect(cert.hasFollowUp).toBe(true);
      expect(cert.followUpOneToTwoDays).toBe(true);
    });

    it("10 — generic fallback contains medication/treatment safety", () => {
      const cert = certifyGenericFallbackHospitalGrade("en");
      expect(cert.hasMedicationTreatment).toBe(true);
      expect(cert.medicationIncludesStopChangeGuard).toBe(true);
    });

    it("11 — generic fallback contains return-to-ED precautions", () => {
      const cert = certifyGenericFallbackHospitalGrade("en");
      expect(cert.returnPrecautionsHospitalGrade).toBe(true);
    });
  });

  describe("Phase 4 — manual diagnosis entry", () => {
    it("12 — manual diagnosis cases do not crash", () => {
      const report = certifyManualDiagnosisFallback();
      expect(report.rows.every((r) => r.noCrash)).toBe(true);
    });

    it("13 — manual label-only gets generic fallback", () => {
      const row = certifyDischargeInstructionsForDiagnosis({
        code: "",
        displayName: "Label only diagnosis",
        source: "manual_entry",
      });
      expect(row.status).toBe("HOSPITAL_GRADE_GENERIC");
    });

    it("14 — invalid code ABC123 does not crash", () => {
      expect(() =>
        certifyDischargeInstructionsForDiagnosis({
          code: "ABC123",
          displayName: "Invalid custom code",
          source: "manual_entry",
        })
      ).not.toThrow();
    });

    it("15 — manual fallback report all safe", () => {
      const report = certifyManualDiagnosisFallback();
      expect(report.allSafe).toBe(true);
      expect(report.rows.filter((r) => r.status === "HOSPITAL_GRADE_GENERIC").length).toBeGreaterThanOrEqual(3);
      expect(MANUAL_DIAGNOSIS_FALLBACK_CASES.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Phase 5 — full ICD catalog audit readiness", () => {
    it("16 — audit supports repo sample mode", () => {
      const audit = buildFullIcdCatalogDischargeCoverageAudit({ mode: "repo_sample" });
      expect(audit.repoSampleRowCount).toBeGreaterThan(0);
      expect(audit.aggregate.failCount).toBe(0);
    });

    it("17 — audit supports injected JSON catalog", () => {
      const audit = buildFullIcdCatalogDischargeCoverageAudit({
        injectedCatalog: [{ code: "Z99.99", label: "Injected unknown" }],
      });
      expect(audit.aggregate.totalAudited).toBe(1);
      expect(audit.aggregate.failCount).toBe(0);
    });

    it("18 — audit aggregate includes generic fallback counts", () => {
      const audit = buildFullIcdCatalogDischargeCoverageAudit();
      expect(audit.aggregate.totalAudited).toBeGreaterThan(0);
      expect(audit.aggregate.genericCount + audit.aggregate.specificCount + audit.aggregate.familyCount).toBe(
        audit.aggregate.totalAudited
      );
    });
  });

  describe("Phase 6 — automatic apply / refresh", () => {
    it("19 — automatic application creates card with generic template", () => {
      const report = certifyAutomaticDiagnosisInstructionApplication();
      expect(report.cardCreated).toBe(true);
      expect(report.templateApplied).toBe(true);
      expect(report.genericFallbackApplied).toBe(true);
      expect(report.allFieldsPopulated).toBe(true);
    });

    it("20 — refresh updates all fields", () => {
      expect(certifyAutomaticDiagnosisInstructionApplication().refreshUpdatesFields).toBe(true);
    });

    it("21 — provider custom text preserved until refresh", () => {
      expect(certifyAutomaticDiagnosisInstructionApplication().customTextPreservedUntilRefresh).toBe(true);
    });

    it("22 — sync refresh overwrites custom text when forced", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-custom",
        code: "R11.2",
        displayName: "Nausea and vomiting",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      const custom = { ...card, description: "Custom only" };
      const ref = { encounterDiagnosisId: "dx-custom", code: "R11.2", label: "Nausea and vomiting", isPrimary: true };
      const refreshed = syncProviderDischargeCardWithRef(custom, ref, {
        applyTemplate: true,
        locale: "en",
        isPrimary: true,
        displayOrder: 0,
        forceOverwrite: true,
      });
      expect(refreshed.description).not.toBe("Custom only");
      expect(refreshed.diagnosisInstructions.trim().length).toBeGreaterThan(10);
    });
  });

  describe("Phase 7 — output surfaces", () => {
    it("23 — preview renders instructions", () => {
      const form = buildCertificationFormForDiagnosis({ code: "R11.2", displayName: "Nausea and vomiting" });
      const surfaces = certifyUniversalOutputSurfaces(form, "en");
      expect(surfaces.previewRenders).toBe(true);
    });

    it("24 — summary renders instructions", () => {
      const form = buildCertificationFormForDiagnosis({ code: "R11.2", displayName: "Nausea and vomiting" });
      expect(certifyUniversalOutputSurfaces(form, "en").summaryRenders).toBe(true);
    });

    it("25 — print HTML renders instructions", () => {
      const form = buildCertificationFormForDiagnosis({ code: "L08.9", displayName: "Cellulitis" });
      expect(certifyUniversalOutputSurfaces(form, "en").printHtmlRenders).toBe(true);
    });

    it("26 — all output surfaces pass for generic diagnosis", () => {
      const form = buildCertificationFormForDiagnosis({ code: "Z99.99", displayName: "Unknown test" });
      expect(certifyUniversalOutputSurfaces(form, "en").allSurfacesOk).toBe(true);
    });
  });

  describe("Clinical routing regressions", () => {
    it("27 — R11.2 remains nausea/vomiting", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "R11.2", displayName: "Nausea and vomiting" }).template.id
      ).toBe("nausea_vomiting_v1");
    });

    it("28 — L08.9 remains cellulitis/skin infection", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "L08.9", displayName: "Cellulitis" }).template.id
      ).toBe("cellulitis_v1");
    });

    it("29 — E11.9 remains type 2 diabetes non-acute", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "E11.9", displayName: "Type 2 diabetes" }).template.id
      ).toBe("type_2_diabetes_v1");
    });

    it("30 — R50.9 pediatric age routes pediatric fever (family resolver)", () => {
      const r = resolveClinicalConditionFamily({
        code: "R50.9",
        displayName: "Fever",
        context: { patientAgeYears: 8 },
      });
      expect(r.templateId).toBe(PEDIATRIC_FEVER_TEMPLATE_ID);
    });

    it("31 — R50.9 adult age routes adult fever (family resolver)", () => {
      const r = resolveClinicalConditionFamily({
        code: "R50.9",
        displayName: "Fever",
        context: { patientAgeYears: 40 },
      });
      expect(r.templateId).toBe(ADULT_FEVER_TEMPLATE_ID);
    });

    it("32 — R50.9 unknown age does not route pediatric (family resolver)", () => {
      const r = resolveClinicalConditionFamily({ code: "R50.9", displayName: "Fever" });
      expect(r.templateId).not.toBe(PEDIATRIC_FEVER_TEMPLATE_ID);
    });
  });

  describe("Legacy catalog audit alignment", () => {
    it("33 — edDischargeDiagnosisCatalog audit has no MISSING rows", () => {
      const rows = auditEdDischargeDiagnosisCoverage();
      expect(rows.every((r) => r.status !== "MISSING")).toBe(true);
      expect(rows.every((r) => r.status !== "PARTIAL")).toBe(true);
    });

    it("34 — generic Z99.99 card auto-applies on creation", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-z99",
        code: "Z99.99",
        displayName: "Unknown",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      expect(card.templateMeta?.templateId).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
      expect(card.description).toContain("Unknown");
    });

    it("35 — preview/summary/print render generic instructions end-to-end", () => {
      const form = buildCertificationFormForDiagnosis({ code: "Z99.99", displayName: "Unknown test" });
      const preview = buildProviderDischargeDocumentationPreviewSections(form, {}, "en");
      expect(JSON.stringify(preview)).toContain("Unknown test");
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:00:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      expect(buildProviderDischargeDocumentationSummaryBlock(merged, "en")!.lines.join("\n").length).toBeGreaterThan(
        50
      );
      const html = getDischargePrintHtml({
        patient: { firstName: "Test", lastName: "Patient", dob: "1990-01-01" },
        encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
        language: "en",
      });
      expect(html).toContain("Unknown test");
    });
  });
});
