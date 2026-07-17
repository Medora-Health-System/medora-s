import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import {
  buildCoverageAuditLevel2PickerUnion,
  getTop100GenericFallbackDiagnoses,
  loadIcd10DevSampleCatalog,
  runCoverageAuditLevel2,
} from "./edDischargeCoverageAuditLevel2";
import {
  applyProviderDischargeTemplateToCardByDiagnosis,
  isProviderDischargeCardTemplateStale,
  providerDischargeCardNeedsLocaleReapply,
  shouldReapplyProviderDischargeTemplateToCard,
} from "./providerDischargeCardTemplateSync";
import { computeProviderDischargeTemplateAppliedHash } from "./providerDischargeTemplateAppliedHash";
import {
  applyProviderDischargeTemplateToCard,
  buildProviderDischargeCardFromDiagnosis,
  ED_DEFAULT_PCP_FOLLOW_UP_TIMING,
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  normalizeProviderDischargeDiagnosisCards,
  type ProviderDischargeDiagnosisCard,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import { validateProviderDischargeTemplateRegistry } from "./providerDischargeTemplateRegistryValidator";

function savedR112Form() {
  const card = applyProviderDischargeTemplateToCard(
    buildProviderDischargeCardFromDiagnosis({
      sourceEncounterDiagnosisId: "dx-r112",
      code: "R11.2",
      displayName: "Nausea and vomiting",
      displayOrder: 0,
      isPrimaryDiagnosis: true,
    }),
    resolveProviderDischargeTemplateForDiagnosis({ code: "R11.2", displayName: "Nausea and vomiting" }),
    { locale: "en", overwriteExisting: true }
  );
  const body = getProviderDischargeSuggestedTextBody(
    PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "nausea_vomiting_v1")!,
    "en"
  );
  return normalizeProviderDischargeDiagnosisCards({
    patientLeftEdAt: "2026-06-03T18:00:00.000Z",
    diagnosisRefs: [{ encounterDiagnosisId: "dx-r112", code: "R11.2", label: "Nausea and vomiting", isPrimary: true }],
    diagnosisDocs: [card],
    returnPrecautions: body.returnPrecautions,
    returnWorkSchool: "",
    followUps: [{ ...newDefaultFollowUpRow(), id: "fu-r112", specialty: "PRIMARY_CARE", timing: ED_DEFAULT_PCP_FOLLOW_UP_TIMING }],
  });
}

describe("MEDUI.ED.DISCHARGE.DIAGNOSIS_INSTRUCTIONS.2A", () => {
  describe("CoverageAuditLevel2", () => {
    const audit = runCoverageAuditLevel2();

    it("1 — reports total picker diagnoses in repo-bound union", () => {
      expect(audit.summary.totalPickerRecordsAudited).toBeGreaterThan(0);
      expect(audit.summary.devIcdSampleRowCount).toBe(106);
      expect(buildCoverageAuditLevel2PickerUnion().length).toBe(audit.summary.totalPickerRecordsAudited);
    });

    it("2 — counts specific vs generic fallback", () => {
      expect(audit.summary.totalDiagnosisSpecificMapped + audit.summary.totalGenericFallbackOnly).toBe(
        audit.summary.totalPickerRecordsAudited
      );
      // Phase 15: 225 picker records; Phase 16 toxicology adds 20 (225 -> 245); Phase 17 OB/GYN/urology adds 40 (245 -> 285).
      expect(audit.summary.totalPickerRecordsAudited).toBe(285);
      expect(audit.summary.totalGenericFallbackOnly).toBe(0);
      expect(audit.summary.totalDiagnosisSpecificMapped).toBe(285);
    });

    it("3 — top 100 fallback list is generated when any generic fallback exists", () => {
      const top = getTop100GenericFallbackDiagnoses();
      if (audit.summary.totalGenericFallbackOnly > 0) {
        expect(top.length).toBeGreaterThan(0);
        expect(top.length).toBeLessThanOrEqual(100);
      } else {
        expect(top).toEqual([]);
      }
    });

    it("4 — known quick-pick diagnoses do not use generic fallback", () => {
      for (const pick of COMMON_DIAGNOSES) {
        const resolved = resolveProviderDischargeTemplateForDiagnosis({
          code: pick.code,
          displayName: pick.label,
        });
        expect(resolved.template.id, pick.code).not.toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
      }
    });

    it("5 — unknown ICD still uses generic fallback", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "Z99.99",
        displayName: "Unmapped diagnosis",
      });
      expect(resolved.template.id).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });

    it("picker model is hybrid API search + manual", () => {
      expect(audit.summary.pickerModel).toBe("hybrid_api_search_and_manual");
      expect(loadIcd10DevSampleCatalog().length).toBe(106);
    });
  });

  describe("DiagnosisMappingClinicalReview — safe mappings", () => {
    it("6 — L08.9 maps to cellulitis/skin infection, not wound/laceration", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "L08.9",
        displayName: "Infection locale de la peau et du tissu sous-cutané, sans précision",
      });
      expect(resolved.template.id).toBe("cellulitis_v1");
      expect(resolved.matchLevel).not.toBe("keyword");
    });

    it("7 — E11.9 maps to type 2 diabetes outpatient, not hyperglycemia", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "E11.9",
        displayName: "Diabète sucré de type 2, sans complication",
      });
      expect(resolved.template.id).toBe("type_2_diabetes_v1");
      expect(resolved.template.id).not.toBe("hyperglycemia_v1");
    });

    it("E11.65 still maps to hyperglycemia when clinically appropriate", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "E11.65",
        displayName: "Type 2 diabetes with hyperglycemia",
      });
      expect(resolved.template.id).toBe("hyperglycemia_v1");
    });

    it("8 — J00 maps to age-neutral URI/cough template, not pediatric-only URI", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "J00",
        displayName: "Rhinopharyngite aiguë [rhume banal]",
      });
      expect(resolved.template.id).toBe("uri_cough_v1");
      expect(resolved.template.id).not.toBe("pediatric_uri_v1");
    });

    it("R53.1 weakness maps to generalized weakness template, not stroke/TIA keyword hijack", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "R53.1",
        displayName: "Weakness",
      });
      expect(resolved.template.id).toBe("high_risk_medical_general_weakness_v1");
      expect(resolved.template.id).not.toBe("tia_stroke_like_v1");
    });

    it("9 — keyword mapping does not override ICD-family mapping (K59.1 → gastroenteritis, not constipation)", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "K59.1",
        displayName: "Diarrhée fonctionnelle",
      });
      expect(resolved.template.id).toBe("gastroenteritis_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });
  });

  describe("RuntimeNormalizationIntegrity", () => {
    function cardWithCustomText(): ProviderDischargeDiagnosisCard {
      return {
        id: "doc-custom",
        sourceEncounterDiagnosisId: "dx-custom",
        encounterDiagnosisId: "dx-custom",
        code: "R11.2",
        displayName: "Nausea and vomiting",
        isPrimaryDiagnosis: true,
        displayOrder: 0,
        description: "Clinician custom description",
        diagnosisInstructions: "Clinician custom instructions",
        medicationTreatment: "Clinician custom medication plan",
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
          templateAppliedHash: "abc123",
        },
      };
    }

    it("10 — provider custom text saved and rehydrated unchanged", () => {
      const form = normalizeProviderDischargeDiagnosisCards({
        patientLeftEdAt: "2026-06-03T18:00:00.000Z",
        diagnosisRefs: [{ encounterDiagnosisId: "dx-custom", code: "R11.2", label: "Nausea and vomiting", isPrimary: true }],
        diagnosisDocs: [cardWithCustomText()],
        returnPrecautions: "Return if worse.",
        returnWorkSchool: "",
        followUps: [],
      });
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:05:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const rehydrated = hydrateProviderDischargeDocumentationForm(merged);
      expect(rehydrated.diagnosisDocs[0]!.description).toBe("Clinician custom description");
      expect(rehydrated.diagnosisDocs[0]!.diagnosisInstructions).toBe("Clinician custom instructions");
      expect(rehydrated.diagnosisDocs[0]!.medicationTreatment).toBe("Clinician custom medication plan");
    });

    it("11 — provider-confirmed cards do not silently reapply normalized text", () => {
      const card = cardWithCustomText();
      expect(shouldReapplyProviderDischargeTemplateToCard(card, { encounterDiagnosisId: "dx-custom", code: "R11.2", label: "Nausea and vomiting", isPrimary: true })).toBe(false);
      expect(isProviderDischargeCardTemplateStale(card, "en")).toBe(false);
      const next = applyProviderDischargeTemplateToCardByDiagnosis(card, { locale: "en", overwriteExisting: false });
      expect(next.description).toBe("Clinician custom description");
      expect(next.medicationTreatment).toBe("Clinician custom medication plan");
    });

    it("12 — apply / refresh intentionally updates all template fields", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-refresh",
        code: "R11.2",
        displayName: "Nausea and vomiting",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      card.description = "Stale";
      card.diagnosisInstructions = "Stale";
      card.medicationTreatment = "Stale";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R11.2", displayName: "Nausea and vomiting" });
      const refreshed = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: true });
      const body = getProviderDischargeSuggestedTextBody(resolved.template, "en");
      expect(refreshed.description).toBe(body.description);
      expect(refreshed.medicationTreatment).toBe(body.medicationTreatment);
    });

    it("13 — templateAppliedHash stable for unchanged template application", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "nausea_vomiting_v1")!;
      const hash1 = computeProviderDischargeTemplateAppliedHash(template, "en");
      const hash2 = computeProviderDischargeTemplateAppliedHash(template, "en");
      expect(hash1).toBe(hash2);
    });

    it("hydration does not call normalization on saved custom text", () => {
      const form = savedR112Form();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:05:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const before = form.diagnosisDocs[0]!.medicationTreatment;
      const rehydrated = hydrateProviderDischargeDocumentationForm(merged);
      expect(rehydrated.diagnosisDocs[0]!.medicationTreatment).toBe(before);
    });

    it("locale switching reapply blocked when providerConfirmed", () => {
      const card = cardWithCustomText();
      expect(providerDischargeCardNeedsLocaleReapply(card, "fr")).toBe(false);
    });
  });

  describe("R11.2 visibility and follow-up governance", () => {
    it("14 — R11.2 resolves to nausea_vomiting_v1", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R11.2", displayName: "Nausea and vomiting" });
      expect(resolved.template.id).toBe("nausea_vomiting_v1");
    });

    it("15 — R11.2 medication/treatment in preview, summary, and print HTML", () => {
      const form = savedR112Form();
      const preview = buildProviderDischargeDocumentationPreviewSections(form, {}, "en");
      expect(preview.find((s) => s.id === "providerDoc")!.lines.join("\n")).toContain("anti-nausea");
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:05:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      expect(buildProviderDischargeDocumentationSummaryBlock(merged, "en")!.lines.join("\n")).toContain("anti-nausea");
      const html = getDischargePrintHtml({
        patient: { firstName: "Test", lastName: "Patient", dob: "1990-01-01" },
        encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
        language: "en",
      });
      expect(html).toContain("anti-nausea");
    });

    it("17 — no 1–2 week ED follow-up default", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        for (const row of template.defaultFollowUps ?? []) {
          expect(row.timing.toLowerCase()).not.toMatch(/1[–-]2 week/);
        }
      }
    });

    it("18 — specialist follow-up includes timeframe or directed timing", () => {
      const cardiology = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!
        .defaultFollowUps?.find((r) => r.specialty === "CARDIOLOGY");
      expect(cardiology?.timing).toContain("within 1–2 days");
    });

    it("19 — generic fallback remains for unknown diagnoses", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "Unknown" }).template.id
      ).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });
  });

  describe("governance and registry", () => {
    it("16 — Medora release rule exists in PRE_MERGE_GATE documentation", () => {
      const candidates = [
        join(process.cwd(), "docs/PRE_MERGE_GATE.md"),
        join(process.cwd(), "../docs/PRE_MERGE_GATE.md"),
        join(process.cwd(), "../../docs/PRE_MERGE_GATE.md"),
      ];
      const path = candidates.find((p) => {
        try {
          readFileSync(p, "utf8");
          return true;
        } catch {
          return false;
        }
      });
      expect(path).toBeDefined();
      const doc = readFileSync(path!, "utf8");
      expect(doc).toContain("Medora release rule");
      expect(doc).toContain("pnpm --filter @medora/shared build");
      expect(doc.toLowerCase()).toContain("clinical mapping audit");
    });

    it("registry validator passes after mapping fixes", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
    });
  });
});
