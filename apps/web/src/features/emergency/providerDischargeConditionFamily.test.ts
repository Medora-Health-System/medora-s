import { describe, expect, it } from "vitest";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import { buildConditionFamilyGapConflictReport } from "./providerDischargeConditionFamilyGapAnalysis";
import {
  CLINICAL_CONDITION_FAMILY_DEFINITIONS,
  getClinicalConditionFamilyById,
} from "./providerDischargeConditionFamilies";
import {
  conditionFamilyKeywordWouldOverrideIcdMatch,
  resolveClinicalConditionFamily,
} from "./providerDischargeConditionFamilyResolver";
import { applyProviderDischargeTemplateToCardByDiagnosis } from "./providerDischargeCardTemplateSync";
import {
  applyProviderDischargeTemplateToCard,
  buildProviderDischargeCardFromDiagnosis,
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  normalizeProviderDischargeDiagnosisCards,
  type ProviderDischargeDiagnosisCard,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";

describe("MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.1", () => {
  describe("condition family resolution", () => {
    it("1 — R11.2 resolves to Nausea/Vomiting Family", () => {
      const r = resolveClinicalConditionFamily({ code: "R11.2", displayName: "Nausea with vomiting" });
      expect(r.familyId).toBe("nausea_vomiting");
      expect(r.templateId).toBe("nausea_vomiting_v1");
    });

    it("2 — R11.0 resolves to Nausea/Vomiting Family", () => {
      const r = resolveClinicalConditionFamily({ code: "R11.0", displayName: "Nausea" });
      expect(r.familyId).toBe("nausea_vomiting");
      expect(r.matchLevel).toBe("icdExact");
    });

    it("3 — R11.10 resolves to Nausea/Vomiting Family", () => {
      const r = resolveClinicalConditionFamily({ code: "R11.10", displayName: "Vomiting" });
      expect(r.familyId).toBe("nausea_vomiting");
      expect(r.templateId).toBe("nausea_vomiting_v1");
    });

    it("4 — L03.90 resolves to Cellulitis/Skin Infection Family", () => {
      const r = resolveClinicalConditionFamily({ code: "L03.90", displayName: "Cellulitis" });
      expect(r.familyId).toBe("cellulitis_skin_infection");
      expect(r.templateId).toBe("cellulitis_v1");
    });

    it("5 — L03.115 resolves to Cellulitis/Skin Infection Family", () => {
      const r = resolveClinicalConditionFamily({ code: "L03.115", displayName: "Cellulitis RLL" });
      expect(r.familyId).toBe("cellulitis_skin_infection");
    });

    it("6 — L03.116 resolves to Cellulitis/Skin Infection Family", () => {
      const r = resolveClinicalConditionFamily({ code: "L03.116", displayName: "Cellulitis LLL" });
      expect(r.familyId).toBe("cellulitis_skin_infection");
    });

    it("7 — L08.9 resolves to Cellulitis/Skin Infection Family", () => {
      const r = resolveClinicalConditionFamily({ code: "L08.9", displayName: "Skin infection" });
      expect(r.familyId).toBe("cellulitis_skin_infection");
      expect(r.matchLevel).toBe("icdExact");
    });

    it("8 — E11.9 resolves to Type 2 Diabetes Non-Acute Family", () => {
      const r = resolveClinicalConditionFamily({ code: "E11.9", displayName: "Type 2 diabetes" });
      expect(r.familyId).toBe("type_2_diabetes_non_acute");
      expect(r.templateId).toBe("type_2_diabetes_v1");
    });

    it("9 — E11.65 resolves to Diabetes/Hyperglycemia Family", () => {
      const r = resolveClinicalConditionFamily({ code: "E11.65", displayName: "Type 2 DM with hyperglycemia" });
      expect(r.familyId).toBe("diabetes_hyperglycemia");
      expect(r.templateId).toBe("hyperglycemia_v1");
    });

    it("10 — J00 does not resolve to pediatric URI without pediatric age context", () => {
      const r = resolveClinicalConditionFamily({ code: "J00", displayName: "Acute nasopharyngitis" });
      expect(r.familyId).toBe("uri_cough");
      expect(r.templateId).toBe("uri_cough_v1");
      expect(r.familyId).not.toBe("pediatric_uri");
      const pediatricKeyword = resolveClinicalConditionFamily({
        code: "",
        displayName: "pediatric uri child cold",
        context: { patientAgeYears: 8 },
      });
      expect(pediatricKeyword.familyId).toBe("pediatric_uri");
    });

    it("11 — R53.1 does not resolve to TIA/stroke-like family", () => {
      const r = resolveClinicalConditionFamily({ code: "R53.1", displayName: "Weakness" });
      expect(r.templateId).not.toBe("tia_stroke_like_v1");
      const registry = resolveProviderDischargeTemplateForDiagnosis({ code: "R53.1", displayName: "Weakness" });
      expect(registry.template.id).not.toBe("tia_stroke_like_v1");
    });

    it("12 — ICD exact beats ICD prefix (E11.65 → hyperglycemia, not type 2 family prefix)", () => {
      const r = resolveClinicalConditionFamily({ code: "E11.65", displayName: "Hyperglycemia" });
      expect(r.matchLevel).toBe("icdExact");
      expect(r.templateId).toBe("hyperglycemia_v1");
      expect(r.familyId).toBe("diabetes_hyperglycemia");
    });

    it("12b — duplicate E11.65 icdExact owners resolve deterministically (not first-wins)", () => {
      const a = resolveClinicalConditionFamily({ code: "E11.65", displayName: "Hyperglycemia" });
      const b = resolveClinicalConditionFamily({ code: "E11.65", displayName: "Type 2 DM with hyperglycemia" });
      expect(a.familyId).toBe(b.familyId);
      expect(a.familyId).toBe("diabetes_hyperglycemia");
    });

    it("13 — longer ICD prefix beats shorter prefix", () => {
      const r = resolveClinicalConditionFamily({ code: "L03.115", displayName: "Cellulitis" });
      expect(r.matchLevel).toBe("icdExact");
      expect(r.matchedPrefix).toBeUndefined();
      const prefixOnly = resolveClinicalConditionFamily({ code: "L03.811", displayName: "Cellulitis" });
      expect(prefixOnly.matchLevel).toBe("icdPrefix");
      expect(prefixOnly.matchedPrefix).toBe("L03");
    });

    it("14 — exclusions block unsafe broad-prefix matches (L03 → cellulitis, not trauma wound family)", () => {
      const r = resolveClinicalConditionFamily({ code: "L03.90", displayName: "Cellulitis" });
      expect(r.templateId).toBe("cellulitis_v1");
      expect(r.templateId).not.toBe("wound_laceration_v1");
    });

    it("15 — keyword match does not override ICD exact/family match", () => {
      const wouldOverride = conditionFamilyKeywordWouldOverrideIcdMatch({
        code: "R11.2",
        displayName: "headache and nausea",
      });
      expect(wouldOverride).toBe(false);
      const icd = resolveClinicalConditionFamily({ code: "R11.2", displayName: "" });
      const withKw = resolveClinicalConditionFamily({ code: "R11.2", displayName: "headache and nausea" });
      expect(withKw.familyId).toBe(icd.familyId);
    });

    it("16 — unknown code resolves to generic fallback", () => {
      const r = resolveClinicalConditionFamily({ code: "Z99.99", displayName: "Unknown" });
      expect(r.matchLevel).toBe("generic");
      expect(r.templateId).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
      expect(r.familyId).toBeNull();
    });
  });

  describe("registry parity — existing discharge behavior preserved", () => {
    function r112Card() {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "R11.2",
        displayName: "Nausea and vomiting",
      });
      return applyProviderDischargeTemplateToCard(
        buildProviderDischargeCardFromDiagnosis({
          sourceEncounterDiagnosisId: "dx-r112",
          code: "R11.2",
          displayName: "Nausea and vomiting",
          displayOrder: 0,
          isPrimaryDiagnosis: true,
        }),
        resolved,
        { locale: "en", overwriteExisting: true }
      );
    }

    it("17 — R11.2 registry template still produces medication/treatment text", () => {
      const card = r112Card();
      expect(card.medicationTreatment.toLowerCase()).toMatch(/anti-nausea|medication/);
    });

    it("18 — print/summary still includes medication/treatment", () => {
      const card = r112Card();
      const body = getProviderDischargeSuggestedTextBody(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "nausea_vomiting_v1")!,
        "en"
      );
      const form = normalizeProviderDischargeDiagnosisCards({
        patientLeftEdAt: "2026-06-03T18:00:00.000Z",
        diagnosisRefs: [{ encounterDiagnosisId: "dx-r112", code: "R11.2", label: "Nausea and vomiting", isPrimary: true }],
        diagnosisDocs: [card],
        returnPrecautions: body.returnPrecautions,
        returnWorkSchool: "",
        followUps: [],
      });
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:05:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const preview = buildProviderDischargeDocumentationPreviewSections(form, {}, "en");
      expect(preview.find((s) => s.id === "providerDoc")!.lines.join("\n")).toContain("Diagnosis medication / treatment");
      expect(buildProviderDischargeDocumentationSummaryBlock(merged, "en")!.lines.join("\n")).toContain(
        "Diagnosis medication / treatment"
      );
      const html = getDischargePrintHtml({
        patient: { firstName: "T", lastName: "P", dob: "1990-01-01" },
        encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
        language: "en",
      });
      expect(html).toContain("Diagnosis medication / treatment");
    });

    it("19 — provider custom text does not silently mutate on reapply", () => {
      const card: ProviderDischargeDiagnosisCard = {
        id: "doc-c",
        sourceEncounterDiagnosisId: "dx-c",
        encounterDiagnosisId: "dx-c",
        code: "R11.2",
        displayName: "Nausea",
        isPrimaryDiagnosis: true,
        displayOrder: 0,
        description: "Custom note",
        diagnosisInstructions: "Custom instructions",
        medicationTreatment: "Custom meds",
        treatment: "",
        returnPrecautions: "",
        returnWorkSchool: "",
        followUps: [],
        medicationLines: [],
        templateMeta: {
          templateId: "nausea_vomiting_v1",
          templateVersion: "1.0.0",
          matchLevel: "icdFamily",
          sourceReferences: [],
          providerConfirmed: true,
        },
      };
      const next = applyProviderDischargeTemplateToCardByDiagnosis(card, { locale: "en", overwriteExisting: false });
      expect(next.description).toBe("Custom note");
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson(
        {},
        normalizeProviderDischargeDiagnosisCards({
          patientLeftEdAt: "2026-06-03T18:00:00.000Z",
          diagnosisRefs: [{ encounterDiagnosisId: "dx-c", code: "R11.2", label: "Nausea", isPrimary: true }],
          diagnosisDocs: [card],
          returnPrecautions: "",
          returnWorkSchool: "",
          followUps: [],
        }),
        { documentedAt: "2026-06-03T18:05:00.000Z", documentedByDisplayName: "Dr Test" }
      );
      const rehydrated = hydrateProviderDischargeDocumentationForm(merged);
      expect(rehydrated.diagnosisDocs[0]!.description).toBe("Custom note");
    });
  });

  describe("family model scaffolding", () => {
    it("defines at least 20 high-value ED condition families", () => {
      expect(CLINICAL_CONDITION_FAMILY_DEFINITIONS.length).toBeGreaterThanOrEqual(20);
    });

    it("gap analysis runs without throwing", () => {
      const report = buildConditionFamilyGapConflictReport();
      expect(report.rows.length).toBeGreaterThan(0);
      expect(report.alignedCount).toBeGreaterThan(0);
    });

    it("nausea family definition is retrievable by id", () => {
      const family = getClinicalConditionFamilyById("nausea_vomiting");
      expect(family?.templateId).toBe("nausea_vomiting_v1");
      expect(family?.icdPrefixes).toContain("R11");
    });
  });
});
