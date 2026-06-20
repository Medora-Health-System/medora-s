import { describe, expect, it } from "vitest";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import {
  auditEdDischargeDiagnosisCoverage,
  buildEdDischargeDiagnosisCatalog,
  catalogEntriesStillOnGenericFallback,
  isTemplateGoldStandardComplete,
} from "./edDischargeDiagnosisCatalog";
import {
  ED_DISCHARGE_GOLD_STANDARD_MARKERS_EN,
  ED_DISCHARGE_PCP_FOLLOW_UP_PHRASE_EN,
} from "./providerDischargeTemplateGoldStandard";
import {
  applyProviderDischargeTemplateToCard,
  buildProviderDischargeCardFromDiagnosis,
  ED_DEFAULT_PCP_FOLLOW_UP_TIMING,
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { applyProviderDischargeTemplateToCardByDiagnosis } from "./providerDischargeCardTemplateSync";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  normalizeProviderDischargeDiagnosisCards,
  sortProviderDischargeDiagnosisCards,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import { validateProviderDischargeTemplateRegistry } from "./providerDischargeTemplateRegistryValidator";

const FIXED_COMMON_DIAGNOSES = [
  { code: "J03.9", label: "Amygdalite aiguë, sans précision", templateId: "otitis_pharyngitis_v1" },
  { code: "A09", label: "Diarrhée et gastro-entérite d'origine présumée infectieuse", templateId: "gastroenteritis_v1" },
  { code: "E11.9", label: "Diabète sucré de type 2, sans complication", templateId: "type_2_diabetes_v1" },
  { code: "Z23", label: "Besoin de vaccination contre une maladie bactérienne", templateId: "vaccination_visit_v1" },
  { code: "Z00.0", label: "Examen médical général de suivi", templateId: "wellness_visit_v1" },
] as const;

function applyTemplateForCode(code: string, label: string, overwriteExisting = true) {
  const card = buildProviderDischargeCardFromDiagnosis({
    sourceEncounterDiagnosisId: `dx-${code}`,
    code,
    displayName: label,
    displayOrder: 0,
    isPrimaryDiagnosis: true,
  });
  const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: label });
  return applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting });
}

describe("MEDUI.ED.DISCHARGE.DIAGNOSIS_INSTRUCTIONS.2", () => {
  describe("catalog coverage — every ED diagnosis has diagnosis-specific template", () => {
    const audit = auditEdDischargeDiagnosisCoverage();
    const catalog = buildEdDischargeDiagnosisCatalog();

    it("catalog includes diagnosis-tab quick picks plus template canonical codes", () => {
      expect(catalog.length).toBeGreaterThanOrEqual(COMMON_DIAGNOSES.length);
      expect(catalog.some((e) => e.code === "R11.2" || e.code.startsWith("R11"))).toBe(true);
    });

    it("1 — every catalog diagnosis resolves to a non-generic template", () => {
      const onGeneric = catalogEntriesStillOnGenericFallback();
      expect(onGeneric).toEqual([]);
      expect(audit.every((row) => row.hasDiagnosisSpecificTemplate)).toBe(true);
    });

    it("2 — no catalog diagnosis is missing description", () => {
      expect(audit.every((row) => row.hasDescription)).toBe(true);
    });

    it("3 — no catalog diagnosis is missing diagnosis instructions", () => {
      expect(audit.every((row) => row.hasInstructions)).toBe(true);
    });

    it("4 — no catalog diagnosis is missing medication/treatment", () => {
      expect(audit.every((row) => row.hasMedicationTreatment)).toBe(true);
    });

    it("5 — no catalog diagnosis is missing return precautions", () => {
      expect(audit.every((row) => row.hasReturnPrecautions)).toBe(true);
    });

    it("6 — no catalog diagnosis is missing follow-up defaults", () => {
      expect(audit.every((row) => row.hasFollowUp)).toBe(true);
    });

    it("every catalog row is SPECIFIC_COMPLETE", () => {
      expect(audit.every((row) => row.status === "SPECIFIC_COMPLETE")).toBe(true);
    });
  });

  describe("mapping and fallback behavior", () => {
    it("7 — R11.2 resolves to nausea_vomiting_v1", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "R11.2",
        displayName: "Nausea and vomiting",
      });
      expect(resolved.matchLevel).not.toBe("generic");
      expect(resolved.template.id).toBe("nausea_vomiting_v1");
    });

    it("8 — generic fallback still works for unknown/unmapped diagnoses", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "Z99.99",
        displayName: "Unmapped diagnosis",
      });
      expect(resolved.matchLevel).toBe("generic");
      expect(resolved.template.id).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
      const body = getProviderDischargeSuggestedTextBody(resolved.template, "en");
      expect(body.description.trim()).not.toBe("");
      expect(body.diagnosisInstructions.trim()).not.toBe("");
      expect(body.medicationTreatment).toContain(ED_DISCHARGE_GOLD_STANDARD_MARKERS_EN.medicationSafety);
    });

    it("9 — generic fallback is not used for known common-diagnosis catalog entries", () => {
      for (const entry of FIXED_COMMON_DIAGNOSES) {
        const resolved = resolveProviderDischargeTemplateForDiagnosis({
          code: entry.code,
          displayName: entry.label,
        });
        expect(resolved.template.id).toBe(entry.templateId);
        expect(resolved.template.id).not.toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
      }
    });
  });

  describe("follow-up timing governance", () => {
    it("10 — no ED template default follow-up uses 1–2 weeks wording", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        for (const row of template.defaultFollowUps ?? []) {
          expect(row.timing.toLowerCase()).not.toMatch(/1[–-]2 week/);
        }
      }
    });

    it("11 — specialist follow-up rows include a timeframe or directed timing", () => {
      const specialistRows = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.flatMap((t) =>
        (t.defaultFollowUps ?? []).filter((row) => row.specialty !== "PRIMARY_CARE")
      );
      expect(specialistRows.length).toBeGreaterThan(0);
      for (const row of specialistRows) {
        const timing = row.timing.toLowerCase();
        const hasTimeframe =
          timing.includes("within 1–2 days") ||
          timing.includes("within 1-2 days") ||
          timing.includes("within 1–3 days") ||
          timing.includes("3–5 days") ||
          timing.includes("as directed") ||
          timing.includes("as appropriate") ||
          timing.includes("as clinically appropriate") ||
          timing.startsWith("if ") ||
          timing.startsWith("for ");
        expect(hasTimeframe, `specialist row ${row.id}: ${row.timing}`).toBe(true);
      }
    });

    it("chest pain cardiology follow-up uses within 1–2 days specialist wording", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
      const cardiology = template.defaultFollowUps?.find((row) => row.specialty === "CARDIOLOGY");
      expect(cardiology?.timing).toContain("within 1–2 days");
    });
  });

  describe("medication/treatment visibility in preview, summary, and print", () => {
    function savedFormForCode(code: string, label: string) {
      const card = applyTemplateForCode(code, label);
      const template = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: label }).template;
      const body = getProviderDischargeSuggestedTextBody(template, "en");
      return normalizeProviderDischargeDiagnosisCards({
        patientLeftEdAt: "2026-06-03T18:00:00.000Z",
        diagnosisRefs: [{ encounterDiagnosisId: `dx-${code}`, code, label, isPrimary: true }],
        diagnosisDocs: [card],
        returnPrecautions: body.returnPrecautions,
        returnWorkSchool: "",
        followUps: [{ ...newDefaultFollowUpRow(), id: `fu-${code}`, specialty: "PRIMARY_CARE", timing: ED_DEFAULT_PCP_FOLLOW_UP_TIMING }],
      });
    }

    it("12 — medication/treatment appears in preview", () => {
      const form = savedFormForCode("R11.2", "Nausea and vomiting");
      const sections = buildProviderDischargeDocumentationPreviewSections(form, {}, "en");
      const blob = sections.find((s) => s.id === "providerDoc")!.lines.join("\n");
      expect(blob).toContain("Diagnosis medication / treatment");
      expect(blob).toContain("Do not start new medications without clinician guidance");
    });

    it("13 — medication/treatment appears in saved summary", () => {
      const form = savedFormForCode("R11.2", "Nausea and vomiting");
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:05:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en");
      expect(block!.lines.join("\n")).toContain("Diagnosis medication / treatment");
    });

    it("14 — medication/treatment appears in discharge print HTML", () => {
      const form = savedFormForCode("Z23", "Vaccination need");
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:05:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const html = getDischargePrintHtml({
        patient: { firstName: "Test", lastName: "Patient", dob: "1990-01-01" },
        encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
        language: "en",
      });
      expect(html).toContain("Diagnosis medication / treatment");
      expect(html).toContain("Do not start new medications without clinician guidance");
    });
  });

  describe("multi-diagnosis ordering and instruction safety", () => {
    it("15 — primary diagnosis renders before secondary diagnosis", () => {
      const primary = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-primary",
        code: "R11.2",
        displayName: "Nausea and vomiting",
        displayOrder: 1,
        isPrimaryDiagnosis: true,
      });
      const secondary = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-secondary",
        code: "J06.9",
        displayName: "Acute URI",
        displayOrder: 0,
        isPrimaryDiagnosis: false,
      });
      const sorted = sortProviderDischargeDiagnosisCards([secondary, primary]);
      expect(sorted[0]!.code).toBe("R11.2");
      expect(sorted[0]!.isPrimaryDiagnosis).toBe(true);

      const form = normalizeProviderDischargeDiagnosisCards({
        patientLeftEdAt: "2026-06-03T18:00:00.000Z",
        diagnosisRefs: [
          { encounterDiagnosisId: "dx-primary", code: "R11.2", label: "Nausea and vomiting", isPrimary: true },
          { encounterDiagnosisId: "dx-secondary", code: "J06.9", label: "Acute URI", isPrimary: false },
        ],
        diagnosisDocs: sorted,
        returnPrecautions: "Return if worse.",
        returnWorkSchool: "",
        followUps: [],
      });
      const sections = buildProviderDischargeDocumentationPreviewSections(form, {}, "en");
      const blob = sections.find((s) => s.id === "providerDoc")!.lines.join("\n");
      expect(blob.indexOf("R11.2")).toBeLessThan(blob.indexOf("J06.9"));
    });

    it("16 — multiple diagnosis instructions do not duplicate shared follow-up phrasing", () => {
      const primary = applyTemplateForCode("R11.2", "Nausea and vomiting");
      const secondary = applyTemplateForCode("J06.9", "Acute URI");
      const followUpPhrase = ED_DISCHARGE_PCP_FOLLOW_UP_PHRASE_EN.toLowerCase();
      for (const card of [primary, secondary]) {
        expect(card.diagnosisInstructions.toLowerCase()).not.toContain(followUpPhrase);
        expect(card.diagnosisInstructions.toLowerCase()).not.toMatch(/within 1[–-]2 week/);
      }
    });
  });

  describe("apply / refresh behavior", () => {
    it("17 — explicit refresh (overwriteExisting) updates all template fields", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-refresh",
        code: "R11.2",
        displayName: "Nausea and vomiting",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      card.description = "Stale description";
      card.diagnosisInstructions = "Stale instructions";
      card.medicationTreatment = "Stale medication";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "R11.2",
        displayName: "Nausea and vomiting",
      });
      const refreshed = applyProviderDischargeTemplateToCard(card, resolved, {
        locale: "en",
        overwriteExisting: true,
      });
      const body = getProviderDischargeSuggestedTextBody(resolved.template, "en");
      expect(refreshed.description).toBe(body.description);
      expect(refreshed.medicationTreatment).toBe(body.medicationTreatment);
      expect(refreshed.diagnosisInstructions.trim()).not.toBe("Stale instructions");
    });

    it("18 — existing custom text is not overwritten unless refresh is clicked", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-custom",
        code: "J45.901",
        displayName: "Asthma exacerbation",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: false,
        locale: "en",
      });
      card.description = "Clinician-authored note";
      card.templateMeta = {
        templateId: "asthma_exacerbation_v1",
        templateVersion: "1.0.0",
        matchLevel: "icdFamily",
        sourceReferences: [],
        providerConfirmed: true,
      };
      const next = applyProviderDischargeTemplateToCardByDiagnosis(card, {
        locale: "en",
        overwriteExisting: false,
      });
      expect(next.description).toBe("Clinician-authored note");
    });
  });

  describe("gold-standard language on all non-generic templates", () => {
    it("19 — all non-generic templates include safe return precaution and medication language", () => {
      const nonGeneric = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter(
        (t) => t.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID
      );
      expect(nonGeneric.length).toBeGreaterThan(0);
      for (const template of nonGeneric) {
        expect(isTemplateGoldStandardComplete(template.id, "en"), template.id).toBe(true);
      }
    });

    it("registry validator passes after template additions", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
