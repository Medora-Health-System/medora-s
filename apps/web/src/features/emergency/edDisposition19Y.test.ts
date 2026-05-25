import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PROVIDER_DISCHARGE_EDUCATION_TEMPLATES,
  buildEducationSuggestionFromTemplate,
  matchProviderDischargeEducationTemplate,
} from "./providerDischargeEducationTemplates";
import {
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  PROVIDER_DISCHARGE_FOLLOW_UP_SPECIALTIES,
} from "./providerDischargeDocumentationModel";
import {
  NURSING_DISCHARGE_CONDITIONS,
  NURSING_DISCHARGE_DESTINATIONS,
  NURSING_DISCHARGE_TEACHING_ITEMS,
  mergeNursingDischargeExecutionIntoNursingAssessment,
  nursingDischargeFormToStored,
} from "./nursingDischargeExecutionModel";
import {
  buildNursingDischargeExecutionSummaryBlock19Y,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("edDisposition19Y", () => {
  it("education templates include source metadata for each template", () => {
    for (const template of PROVIDER_DISCHARGE_EDUCATION_TEMPLATES) {
      expect(template.sources.length).toBeGreaterThan(0);
      for (const source of template.sources) {
        expect(source.id.trim()).not.toBe("");
        expect(source.url.startsWith("https://")).toBe(true);
        expect(source.publisher.trim()).not.toBe("");
      }
    }
  });

  it("diagnosis selection autofills editable suggestion text", () => {
    const template = matchProviderDischargeEducationTemplate({ code: "R07.9", label: "Chest pain" });
    expect(template?.id).toBe("chest_pain");
    const suggestion = buildEducationSuggestionFromTemplate(template!);
    expect(suggestion.description.length).toBeGreaterThan(20);
    expect(suggestion.instructions.length).toBeGreaterThan(10);
    expect(suggestion.returnPrecautions.length).toBeGreaterThan(10);
  });

  it("provider can clear autofilled text via merge (empty strings delete keys)", () => {
    const merged = mergeProviderDischargeDocumentationIntoDischargeJson(
      {},
      {
        patientLeftEdAt: "",
        diagnosisRefs: [],
        description: "",
        diagnosisInstructions: "",
        medicationTreatmentText: "",
        medicationLines: [],
        returnPrecautions: "",
        workSchoolNote: "",
        followUpRows: [],
      },
      { documentedAt: new Date().toISOString(), documentedByDisplayName: "Dr Test" }
    );
    expect(merged.providerDischargeDocumentedByDisplayName).toBe("Dr Test");
    expect(merged.dischargeDiagnosisSummary).toBeUndefined();
  });

  it("medication lines are text-only in discharge JSON (no order identifiers)", () => {
    const merged = mergeProviderDischargeDocumentationIntoDischargeJson(
      {},
      {
        patientLeftEdAt: "",
        diagnosisRefs: [],
        description: "",
        diagnosisInstructions: "",
        medicationTreatmentText: "Ibuprofen 400 mg PO q6h PRN pain",
        medicationLines: [
          {
            id: "m1",
            catalogMedicationId: "cat-1",
            displayName: "Ibuprofen",
            dose: "400 mg",
            frequency: "q6h PRN",
            instructions: "Take with food",
          },
        ],
        returnPrecautions: "",
        workSchoolNote: "",
        followUpRows: [],
      },
      { documentedAt: new Date().toISOString(), documentedByDisplayName: "Dr Test" }
    );
    expect(merged.providerDischargeMedicationLines).toBeDefined();
    expect(JSON.stringify(merged)).not.toContain("orderId");
    expect(JSON.stringify(merged)).not.toContain("MAR");
  });

  it("follow-up supports multiple specialty rows", () => {
    expect(PROVIDER_DISCHARGE_FOLLOW_UP_SPECIALTIES.length).toBeGreaterThanOrEqual(10);
    const form = hydrateProviderDischargeDocumentationForm({
      providerDischargeFollowUps: [
        { id: "1", specialty: "CARDIOLOGY", providerOrFacility: "Clinic", timing: "1 week", phone: "", address: "", comments: "" },
        { id: "2", specialty: "PRIMARY_CARE", providerOrFacility: "PCP", timing: "3 days", phone: "", address: "", comments: "" },
      ],
    });
    expect(form.followUpRows).toHaveLength(2);
  });

  it("nursing destination, condition, and teaching option catalogs exist", () => {
    expect(NURSING_DISCHARGE_DESTINATIONS.length).toBeGreaterThanOrEqual(8);
    expect(NURSING_DISCHARGE_CONDITIONS.length).toBeGreaterThanOrEqual(6);
    expect(NURSING_DISCHARGE_TEACHING_ITEMS.length).toBeGreaterThanOrEqual(10);
  });

  it("nursing discharge execution persists extended fields under erDispositionExecutionV1", () => {
    const stored = nursingDischargeFormToStored(
      {
        destination: "HOME",
        dischargeAtLocal: "2026-05-18T14:30",
        teachingReviewed: ["DIAGNOSIS_REVIEWED", "RETURN_PRECAUTIONS"],
        conditionAtDischarge: "STABLE",
        nursingDischargeNote: "Patient ambulatory.",
      },
      "RN Example",
      "RN"
    );
    const merged = mergeNursingDischargeExecutionIntoNursingAssessment({}, stored);
    const slice = merged.erDispositionExecutionV1 as Record<string, unknown>;
    expect(slice.nursingDestination).toBe("HOME");
    expect(slice.nursingConditionAtDischarge).toBe("STABLE");
    expect(Array.isArray(slice.nursingTeachingReviewed)).toBe(true);
  });

  it("saved provider and nursing discharge appear in summary blocks with actor metadata", () => {
    const at = "2026-05-18T18:00:00.000Z";
    const providerBlock = buildProviderDischargeDocumentationSummaryBlock(
      {
        dischargeDiagnosisSummary: "Evaluated for abdominal pain.",
        providerDischargeDocumentedAt: at,
        providerDischargeDocumentedByDisplayName: "Dr A",
        providerDischargeDocumentedByTitle: "MD",
        patientLeftEdAt: at,
      },
      "en"
    );
    expect(providerBlock?.lines.some((l) => l.includes("Dr A"))).toBe(true);

    const nursingBlock = buildNursingDischargeExecutionSummaryBlock19Y(
      {
        erDispositionExecutionV1: {
          dischargeSortieCompletedAt: at,
          dischargeSortieCompletedByDisplayName: "RN B",
          nursingDestination: "HOME",
          nursingTeachingReviewed: ["WRITTEN_INSTRUCTIONS_PROVIDED"],
          dischargeSortieExecutionNote: "Teaching complete.",
        },
      },
      "en"
    );
    expect(nursingBlock?.lines.some((l) => l.includes("RN B"))).toBe(true);
  });

  it("disposition panel keeps Primary Decision and removes duplicate patient instruction card", () => {
    const source = readFileSync(join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"), "utf8");
    expect(source).toContain("sectionPrimaryDecision");
    expect(source).toContain("ProviderDischargeDocumentationSection");
    expect(source).not.toContain("PatientDischargeInstructionsClosureCard");
    expect(source).not.toContain("sectionDischargeShared");
  });

  it("nursing execution section is separate from provider documentation component", () => {
    const disposition = readFileSync(join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"), "utf8");
    expect(disposition).not.toContain("NursingDischargeExecutionSection");
    const workspace = readFileSync(join(webRoot, "src/features/emergency/EmergencyActiveWorkspaceView.tsx"), "utf8");
    expect(workspace).toContain("NursingDischargeExecutionSection");
  });

  it("preserves disposition save handler wiring", () => {
    const source = readFileSync(join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"), "utf8");
    expect(source).toContain("mergeErDispositionV1IntoNursingAssessment");
    expect(source).toContain("buildProviderDischargeJsonForSave");
    expect(source).toContain("handleSave");
  });
});
