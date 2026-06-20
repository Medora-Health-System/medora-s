import { describe, expect, it } from "vitest";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
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
  emptyProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  normalizeProviderDischargeDiagnosisCards,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import { validateProviderDischargeTemplateRegistry } from "./providerDischargeTemplateRegistryValidator";

const R11_2_CODE = "R11.2";
const R11_2_DISPLAY = "Nausea and vomiting";

function r112CardWithTemplateApplied() {
  const card = buildProviderDischargeCardFromDiagnosis({
    sourceEncounterDiagnosisId: "dx-r112",
    code: R11_2_CODE,
    displayName: R11_2_DISPLAY,
    displayOrder: 0,
    isPrimaryDiagnosis: true,
  });
  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: R11_2_CODE,
    displayName: R11_2_DISPLAY,
  });
  expect(resolved.template.id).toBe("nausea_vomiting_v1");
  return applyProviderDischargeTemplateToCard(card, resolved, {
    locale: "en",
    overwriteExisting: true,
  });
}

function r112SavedForm() {
  const card = r112CardWithTemplateApplied();
  const nauseaTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "nausea_vomiting_v1")!;
  return normalizeProviderDischargeDiagnosisCards({
    patientLeftEdAt: "2026-06-03T18:00:00.000Z",
    diagnosisRefs: [
      {
        encounterDiagnosisId: "dx-r112",
        code: R11_2_CODE,
        label: R11_2_DISPLAY,
        isPrimary: true,
      },
    ],
    diagnosisDocs: [card],
    returnPrecautions: getProviderDischargeSuggestedTextBody(nauseaTemplate, "en").returnPrecautions,
    returnWorkSchool: "",
    followUps: [
      {
        ...newDefaultFollowUpRow(),
        id: "fu-r112",
        specialty: "PRIMARY_CARE",
        timing: ED_DEFAULT_PCP_FOLLOW_UP_TIMING,
      },
    ],
  });
}

describe("MEDUI.ED.DISCHARGE.DIAGNOSIS_INSTRUCTIONS.1", () => {
  describe("defaultFollowUps — ED templates default to within 1–2 days", () => {
    it("registry validator passes after timing updates", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("nausea/vomiting (R11 family) PCP follow-up defaults to within 1–2 days", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "nausea_vomiting_v1")!;
      expect(template.defaultFollowUps?.[0]?.timing).toBe(ED_DEFAULT_PCP_FOLLOW_UP_TIMING);
    });

    it("chest pain cardiology follow-up uses specialist within 1–2 days wording", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
      const cardiology = template.defaultFollowUps?.find((row) => row.specialty === "CARDIOLOGY");
      expect(cardiology?.timing).toBe("within 1–2 days or as clinically appropriate");
    });

    it("preserves pediatric fever urgent follow-up exception", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_fever_v1")!;
      const pcp = template.defaultFollowUps?.find((row) => row.id === "pf-pcp");
      expect(pcp?.timing).toBe("within 1–3 days if fever persists");
    });

    it("preserves wound recheck procedure-specific timing", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "wound_laceration_v1")!;
      const woundCare = template.defaultFollowUps?.find((row) => row.specialty === "WOUND_CARE");
      expect(woundCare?.timing).toBe("3–5 days if advised");
    });

    it("generic fallback resolves for unmatched diagnoses", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "Z99.99",
        displayName: "Unmatched diagnosis",
      });
      expect(resolved.matchLevel).toBe("generic");
      expect(resolved.template.id).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });

    it("generic template includes PCP within 1–2 days default follow-up", () => {
      const generic = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
        (t) => t.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID
      )!;
      expect(generic.defaultFollowUps?.[0]?.timing).toBe(ED_DEFAULT_PCP_FOLLOW_UP_TIMING);
    });
  });

  describe("R11.2 medication/treatment visibility", () => {
    it("template apply fills medicationTreatment from nausea_vomiting_v1", () => {
      const card = r112CardWithTemplateApplied();
      expect(card.medicationTreatment).toContain("anti-nausea");
    });

    it("preview includes medicationTreatment for R11.2", () => {
      const form = r112SavedForm();
      const sections = buildProviderDischargeDocumentationPreviewSections(form, {}, "en");
      const docSection = sections.find((s) => s.id === "providerDoc");
      expect(docSection).toBeDefined();
      const blob = docSection!.lines.join("\n");
      expect(blob).toContain(R11_2_CODE);
      expect(blob).toContain("Diagnosis medication / treatment");
      expect(blob).toContain("anti-nausea");
    });

    it("saved summary includes medicationTreatment for R11.2", () => {
      const form = r112SavedForm();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:05:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en");
      expect(block).not.toBeNull();
      const blob = block!.lines.join("\n");
      expect(blob).toContain(R11_2_CODE);
      expect(blob).toContain("Diagnosis medication / treatment");
      expect(blob).toContain("anti-nausea");
    });

    it("final discharge print HTML includes medicationTreatment for R11.2", () => {
      const form = r112SavedForm();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:05:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const html = getDischargePrintHtml({
        patient: { firstName: "Test", lastName: "Patient", dob: "1990-01-01" },
        encounter: {
          createdAt: "2026-06-03T17:00:00.000Z",
          dischargeSummaryJson: merged,
        },
        language: "en",
      });
      expect(html).toContain(R11_2_CODE);
      expect(html).toContain("Diagnosis medication / treatment");
      expect(html).toContain("anti-nausea");
    });
  });

  describe("discharge print structured field order", () => {
    it("renders diagnosis documentation in clinical order through follow-up", () => {
      const form = r112SavedForm();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:05:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const html = getDischargePrintHtml({
        patient: { firstName: "Test", lastName: "Patient", dob: "1990-01-01" },
        encounter: {
          createdAt: "2026-06-03T17:00:00.000Z",
          dischargeSummaryJson: merged,
        },
        language: "en",
      });

      const diagnosisIdx = html.indexOf(R11_2_CODE);
      const descriptionIdx = html.indexOf("<strong>Description</strong>");
      const instructionsIdx = html.indexOf("<strong>Diagnosis instructions</strong>");
      const medicationIdx = html.indexOf("<strong>Diagnosis medication / treatment</strong>");
      const returnIdx = html.indexOf("<strong>Return precautions</strong>");
      const followUpIdx = html.indexOf("Follow-up");

      expect(diagnosisIdx).toBeGreaterThan(-1);
      expect(descriptionIdx).toBeGreaterThan(diagnosisIdx);
      expect(instructionsIdx).toBeGreaterThan(descriptionIdx);
      expect(medicationIdx).toBeGreaterThan(instructionsIdx);
      expect(returnIdx).toBeGreaterThan(medicationIdx);
      expect(followUpIdx).toBeGreaterThan(returnIdx);
      expect(html).toContain("within 1–2 days");
    });
  });
});
