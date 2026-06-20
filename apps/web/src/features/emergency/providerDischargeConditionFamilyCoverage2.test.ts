import { describe, expect, it } from "vitest";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import {
  buildClinicalFamilyCoverageReport,
  buildHighVolumeEDFamilyCoverageAudit,
  buildResolverParityReport,
} from "./providerDischargeClinicalFamilyCoverage";
import { buildConditionFamilyCoverageConflictReport } from "./providerDischargeConditionFamilyConflictAnalysis";
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

describe("MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.2", () => {
  describe("Tier 1 family resolution", () => {
    it("1 — R50.9 pediatric fever resolves with age context", () => {
      const r = resolveClinicalConditionFamily({
        code: "R50.9",
        displayName: "Fever",
        context: { patientAgeYears: 5 },
      });
      expect(r.familyId).toBe("pediatric_fever");
      expect(r.templateId).toBe("pediatric_fever_v1");
    });

    it("2 — R53.1 resolves to generalized weakness family", () => {
      const r = resolveClinicalConditionFamily({ code: "R53.1", displayName: "Weakness" });
      expect(r.familyId).toBe("generalized_weakness");
      expect(r.templateId).toBe("high_risk_medical_general_weakness_v1");
    });

    it("3 — E86.0 resolves to dehydration family", () => {
      const r = resolveClinicalConditionFamily({ code: "E86.0", displayName: "Dehydration" });
      expect(r.familyId).toBe("dehydration");
      expect(r.templateId).toBe("dehydration_v1");
    });

    it("4 — H66.9 pediatric otitis resolves with age guardrail", () => {
      const r = resolveClinicalConditionFamily({
        code: "H66.9",
        displayName: "Otitis media",
        context: { patientAgeYears: 4 },
      });
      expect(r.familyId).toBe("pediatric_otitis_media");
      expect(r.templateId).toBe("pediatric_otitis_media_v1");
    });

    it("5 — J02.9 resolves to pharyngitis family", () => {
      const r = resolveClinicalConditionFamily({ code: "J02.9", displayName: "Pharyngitis" });
      expect(r.familyId).toBe("pharyngitis_tonsillitis");
    });

    it("6 — K08.8 resolves to dental pain family", () => {
      const r = resolveClinicalConditionFamily({ code: "K08.8", displayName: "Dental pain" });
      expect(r.familyId).toBe("dental_pain");
      expect(r.templateId).toBe("dental_pain_v1");
    });

    it("7 — J20.9 resolves to bronchitis family", () => {
      const r = resolveClinicalConditionFamily({ code: "J20.9", displayName: "Bronchitis" });
      expect(r.familyId).toBe("bronchitis");
      expect(r.templateId).toBe("bronchitis_v1");
    });

    it("8 — J11.1 resolves to influenza family", () => {
      const r = resolveClinicalConditionFamily({ code: "J11.1", displayName: "Influenza" });
      expect(r.familyId).toBe("influenza");
    });

    it("9 — U07.1 resolves to COVID-19 family", () => {
      const r = resolveClinicalConditionFamily({ code: "U07.1", displayName: "COVID-19" });
      expect(r.familyId).toBe("covid19");
      expect(r.templateId).toBe("infectious_covid_like_illness_v1");
    });

    it("10 — L02.91 resolves to cutaneous abscess family", () => {
      const r = resolveClinicalConditionFamily({ code: "L02.91", displayName: "Abscess" });
      expect(r.familyId).toBe("cutaneous_abscess");
    });

    it("11 — N20.0 resolves to kidney stone family", () => {
      const r = resolveClinicalConditionFamily({ code: "N20.0", displayName: "Kidney stone" });
      expect(r.familyId).toBe("kidney_stone");
      expect(r.templateId).toBe("kidney_stone_v1");
    });
  });

  describe("Tier 2 family resolution", () => {
    it("12 — I50.9 resolves to CHF exacerbation family", () => {
      const r = resolveClinicalConditionFamily({ code: "I50.9", displayName: "Heart failure" });
      expect(r.familyId).toBe("chf_exacerbation");
      expect(r.templateId).toBe("cardio_heart_failure_symptoms_v1");
    });

    it("13 — J44.1 resolves to COPD exacerbation family", () => {
      const r = resolveClinicalConditionFamily({ code: "J44.1", displayName: "COPD exacerbation" });
      expect(r.familyId).toBe("copd_exacerbation");
    });

    it("14 — R00.2 resolves to palpitations family", () => {
      const r = resolveClinicalConditionFamily({ code: "R00.2", displayName: "Palpitations" });
      expect(r.familyId).toBe("palpitations");
    });

    it("15 — S06.0X0A resolves to concussion family", () => {
      const r = resolveClinicalConditionFamily({ code: "S06.0X0A", displayName: "Concussion" });
      expect(r.familyId).toBe("concussion");
      expect(r.templateId).toBe("minor_head_injury_v1");
    });

    it("16 — E11.65 resolves to hyperglycemia tier2 family", () => {
      const r = resolveClinicalConditionFamily({ code: "E11.65", displayName: "Hyperglycemia" });
      expect(["diabetes_hyperglycemia", "hyperglycemia_tier2"]).toContain(r.familyId);
      expect(r.templateId).toBe("hyperglycemia_v1");
    });

    it("17 — E16.2 resolves to hypoglycemia family", () => {
      const r = resolveClinicalConditionFamily({ code: "E16.2", displayName: "Hypoglycemia" });
      expect(r.familyId).toBe("hypoglycemia");
      expect(r.templateId).toBe("hypoglycemia_v1");
    });
  });

  describe("guardrails and routing safety", () => {
    it("18 — cellulitis family excludes L02 abscess prefix", () => {
      const r = resolveClinicalConditionFamily({ code: "L02.91", displayName: "Abscess" });
      expect(r.familyId).not.toBe("cellulitis_skin_infection");
    });

    it("19 — pediatric URI requires age guardrail", () => {
      const adult = resolveClinicalConditionFamily({
        code: "",
        displayName: "pediatric uri",
        context: { patientAgeYears: 25 },
      });
      expect(adult.familyId).not.toBe("pediatric_uri");
      const child = resolveClinicalConditionFamily({
        code: "",
        displayName: "pediatric uri",
        context: { patientAgeYears: 8 },
      });
      expect(child.familyId).toBe("pediatric_uri");
    });

    it("20 — OB/GYN family prefers female sex guardrail", () => {
      const female = resolveClinicalConditionFamily({
        code: "N93.9",
        displayName: "Abnormal bleeding",
        context: { patientSex: "female" },
      });
      expect(female.familyId).toBe("obgyn_bleeding_pelvic_pain");
      const male = resolveClinicalConditionFamily({
        code: "N93.9",
        displayName: "Abnormal bleeding",
        context: { patientSex: "male" },
      });
      expect(male.familyId).not.toBe("obgyn_bleeding_pelvic_pain");
    });

    it("21 — ICD exact beats prefix (E11.9 → type 2 diabetes)", () => {
      const r = resolveClinicalConditionFamily({ code: "E11.9", displayName: "Type 2 diabetes" });
      expect(r.matchLevel).toBe("icdExact");
      expect(r.familyId).toBe("type_2_diabetes_non_acute");
    });

    it("22 — longer prefix beats shorter (J44 vs J4)", () => {
      const r = resolveClinicalConditionFamily({ code: "J44.1", displayName: "COPD" });
      expect(r.familyId).toBe("copd_exacerbation");
      expect(r.matchLevel).toBe("icdPrefix");
    });

    it("23 — keyword never overrides ICD exact (J00)", () => {
      expect(
        conditionFamilyKeywordWouldOverrideIcdMatch({
          code: "J00",
          displayName: "pediatric uri child cold",
        })
      ).toBe(false);
      const r = resolveClinicalConditionFamily({
        code: "J00",
        displayName: "pediatric uri child cold",
      });
      expect(r.familyId).toBe("uri_cough");
      expect(r.matchLevel).toBe("icdExact");
    });

    it("24 — generic fallback still works for unmapped code", () => {
      const r = resolveClinicalConditionFamily({ code: "Z99.99", displayName: "Unknown" });
      expect(r.templateId).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
      expect(r.matchLevel).toBe("generic");
    });

    it("25 — PE evaluation family is UNSAFE and not routed", () => {
      const r = resolveClinicalConditionFamily({ code: "I26.99", displayName: "PE" });
      expect(r.familyId).not.toBe("pe_evaluation_discharge");
    });
  });

  describe("coverage and parity reports", () => {
    it("26 — resolver parity report generates with ≥90% target", () => {
      const report = buildResolverParityReport();
      expect(report.rows.length).toBeGreaterThan(50);
      expect(report.parityPercent).toBeGreaterThanOrEqual(90);
      expect(report.targetMet).toBe(true);
    });

    it("27 — clinical family coverage ≥90%", () => {
      const report = buildClinicalFamilyCoverageReport();
      expect(report.totalRegistryTemplates).toBeGreaterThan(90);
      expect(report.coveragePercent).toBeGreaterThanOrEqual(90);
    });

    it("28 — high-volume ED audit returns domain breakdown", () => {
      const audit = buildHighVolumeEDFamilyCoverageAudit();
      expect(audit.currentFamilyCount).toBeGreaterThanOrEqual(56);
      expect(audit.byDomain.length).toBeGreaterThan(5);
    });

    it("29 — conflict report includes curated J00/E11.9/R55/R42 examples", () => {
      const report = buildConditionFamilyCoverageConflictReport();
      const ids = report.rows.map((r) => `${r.familyA}/${r.familyB}`);
      expect(ids.some((s) => s.includes("uri_cough"))).toBe(true);
      expect(ids.some((s) => s.includes("type_2_diabetes") || s.includes("hyperglycemia"))).toBe(true);
    });
  });

  describe("production compatibility (unchanged registry path)", () => {
    function r112Card(): ProviderDischargeDiagnosisCard {
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

    it("30 — existing discharge templates still render", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "nausea_vomiting_v1")!;
      const body = getProviderDischargeSuggestedTextBody(template, "en");
      expect(body.medicationTreatment.length).toBeGreaterThan(10);
    });

    it("31 — existing print output unchanged", () => {
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
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson(
        {},
        form,
        { documentedAt: "2026-06-03T18:05:00.000Z", documentedByDisplayName: "Dr Test" }
      );
      const html = getDischargePrintHtml({
        patient: { firstName: "T", lastName: "P", dob: "1990-01-01" },
        encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
        language: "en",
      });
      expect(html).toContain("Diagnosis medication / treatment");
    });

    it("32 — provider custom text unchanged after template apply", () => {
      const card: ProviderDischargeDiagnosisCard = {
        id: "doc-c2",
        sourceEncounterDiagnosisId: "dx-c2",
        encounterDiagnosisId: "dx-c2",
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
    });

    it("33 — registry resolver unchanged for R11.2", () => {
      const registry = resolveProviderDischargeTemplateForDiagnosis({
        code: "R11.2",
        displayName: "Nausea with vomiting",
      });
      expect(registry.template.id).toBe("nausea_vomiting_v1");
    });

    it("34 — discharge summary block still builds", () => {
      const card = r112Card();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson(
        {},
        normalizeProviderDischargeDiagnosisCards({
          patientLeftEdAt: "2026-06-03T18:00:00.000Z",
          diagnosisRefs: [{ encounterDiagnosisId: "dx-r112", code: "R11.2", label: "Nausea", isPrimary: true }],
          diagnosisDocs: [card],
          returnPrecautions: "",
          returnWorkSchool: "",
          followUps: [],
        }),
        { documentedAt: "2026-06-03T18:05:00.000Z", documentedByDisplayName: "Dr Test" }
      );
      expect(buildProviderDischargeDocumentationSummaryBlock(merged, "en")!.lines.join("\n")).toContain(
        "Diagnosis medication / treatment"
      );
    });

    it("35 — documentation merge path unchanged", () => {
      const card = r112Card();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson(
        {},
        normalizeProviderDischargeDiagnosisCards({
          patientLeftEdAt: "2026-06-03T18:00:00.000Z",
          diagnosisRefs: [{ encounterDiagnosisId: "dx-r112", code: "R11.2", label: "Nausea", isPrimary: true }],
          diagnosisDocs: [card],
          returnPrecautions: "",
          returnWorkSchool: "",
          followUps: [],
        }),
        { documentedAt: "2026-06-03T18:05:00.000Z", documentedByDisplayName: "Dr Test" }
      );
      const rehydrated = hydrateProviderDischargeDocumentationForm(merged);
      expect(rehydrated.diagnosisDocs[0]!.code).toBe("R11.2");
    });
  });

  describe("family definition integrity", () => {
    it("all tier 1 families exist with routing status", () => {
      const tier1Ids = [
        "fever",
        "pediatric_fever",
        "generalized_weakness",
        "dehydration",
        "otitis_media",
        "pharyngitis_tonsillitis",
        "dental_pain",
        "sinusitis",
        "bronchitis",
        "influenza",
        "covid19",
        "cutaneous_abscess",
        "kidney_stone",
        "hematuria",
        "urinary_retention",
        "viral_syndrome",
        "allergic_reaction",
        "rash_dermatitis",
        "constipation",
        "nausea_vomiting_with_dehydration",
        "medication_refill_low_risk",
      ];
      for (const id of tier1Ids) {
        expect(getClinicalConditionFamilyById(id)?.routingStatus).toBeDefined();
      }
    });

    it("behavioral health crisis has crisis return guardrails", () => {
      const bh = getClinicalConditionFamilyById("behavioral_health_crisis");
      expect(bh?.guardrails?.safety?.requiresCrisisReturnPrecautions).toBe(true);
    });

    it("family count expanded beyond phase 1", () => {
      expect(CLINICAL_CONDITION_FAMILY_DEFINITIONS.length).toBeGreaterThan(50);
    });
  });
});
