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
  createDiagnosisDocFromRef,
  findDiagnosisDocForRef,
  getSelectedDiagnosisDocs,
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  PROVIDER_DISCHARGE_FOLLOW_UP_SPECIALTIES,
  validateProviderDischargeDocumentation,
  type ProviderDischargeDocumentationForm,
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

const validationMessages = {
  requiredDescription: "Description required",
  requiredInstructions: "Instructions required",
  requiredMedication: "Medication required",
  requiredReturnPrecautions: "Return precautions required",
  requiredFollowUp: "Follow-up required",
};

function completeDoc(
  id: string,
  encounterDiagnosisId: string,
  code: string,
  displayName: string
) {
  return {
    id,
    encounterDiagnosisId,
    code,
    displayName,
    description: `Description for ${code}`,
    diagnosisInstructions: `Instructions for ${code}`,
    medicationTreatment: `Medication for ${code}`,
    returnPrecautions: `Precautions for ${code}`,
    followUps: [{ ...newDefaultFollowUpRow(), timing: "1 week" }],
  };
}

function formWithThreeSelected(): ProviderDischargeDocumentationForm {
  const refs = [
    { encounterDiagnosisId: "dx-1", code: "R07.9", label: "Chest pain, unspecified", isPrimary: true },
    { encounterDiagnosisId: "dx-2", code: "R10.9", label: "Abdominal pain, unspecified" },
    { encounterDiagnosisId: "dx-3", code: "S01.01", label: "Laceration of scalp" },
  ];
  return {
    patientLeftEdAt: "",
    diagnosisRefs: refs,
    diagnosisDocs: [
      completeDoc("doc-1", "dx-1", "R07.9", "Chest pain, unspecified"),
      completeDoc("doc-2", "dx-2", "R10.9", "Abdominal pain, unspecified"),
      completeDoc("doc-3", "dx-3", "S01.01", "Laceration of scalp"),
    ],
  };
}

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

  it("selecting three diagnoses yields three independent diagnosis documentation cards", () => {
    const form = formWithThreeSelected();
    expect(getSelectedDiagnosisDocs(form)).toHaveLength(3);
    const codes = getSelectedDiagnosisDocs(form).map((d) => d.code);
    expect(codes).toEqual(["R07.9", "R10.9", "S01.01"]);
  });

  it("each card has its own description, instructions, medication, return precautions, and follow-up", () => {
    const form = formWithThreeSelected();
    const docs = getSelectedDiagnosisDocs(form);
    for (const doc of docs) {
      expect(doc.description).toContain(doc.code);
      expect(doc.diagnosisInstructions).toContain(doc.code);
      expect(doc.medicationTreatment).toContain(doc.code);
      expect(doc.returnPrecautions).toContain(doc.code);
      expect(doc.followUps.length).toBeGreaterThan(0);
    }
    expect(docs[0]!.description).not.toBe(docs[1]!.description);
  });

  it("chest pain template autofills only the chest pain card", () => {
    const chestRef = { encounterDiagnosisId: "dx-1", code: "R07.9", label: "Chest pain" };
    const woundRef = { encounterDiagnosisId: "dx-2", code: "S01.01", label: "Scalp laceration" };
    const chestDoc = createDiagnosisDocFromRef(chestRef);
    const woundDoc = createDiagnosisDocFromRef(woundRef);

    const chestTemplate = matchProviderDischargeEducationTemplate({ code: chestRef.code, label: chestRef.label });
    const chestSuggestion = buildEducationSuggestionFromTemplate(chestTemplate!);
    chestDoc.description = chestSuggestion.description;
    chestDoc.diagnosisInstructions = chestSuggestion.instructions;
    chestDoc.returnPrecautions = chestSuggestion.returnPrecautions;

    expect(chestDoc.description.length).toBeGreaterThan(20);
    expect(woundDoc.description).toBe("");
    expect(woundDoc.diagnosisInstructions).toBe("");
  });

  it("wound template autofills only the wound card", () => {
    const woundTemplate = matchProviderDischargeEducationTemplate({ code: "S01.01", label: "Laceration" });
    expect(woundTemplate?.id).toBe("wound_laceration");
    const suggestion = buildEducationSuggestionFromTemplate(woundTemplate!);
    const woundDoc = createDiagnosisDocFromRef({ encounterDiagnosisId: "dx-w", code: "S01.01", label: "Laceration" });
    woundDoc.description = suggestion.description;
    const chestDoc = createDiagnosisDocFromRef({ encounterDiagnosisId: "dx-c", code: "R07.9", label: "Chest pain" });
    expect(woundDoc.description.length).toBeGreaterThan(10);
    expect(chestDoc.description).toBe("");
  });

  it("editing one diagnosis card does not change another card", () => {
    const form = formWithThreeSelected();
    const updatedDocs = form.diagnosisDocs.map((d) =>
      d.encounterDiagnosisId === "dx-1" ? { ...d, description: "Updated chest pain only" } : d
    );
    const next = { ...form, diagnosisDocs: updatedDocs };
    const chest = findDiagnosisDocForRef(next, form.diagnosisRefs[0]!)!;
    const abdomen = findDiagnosisDocForRef(next, form.diagnosisRefs[1]!)!;
    expect(chest.description).toBe("Updated chest pain only");
    expect(abdomen.description).toContain("R10.9");
  });

  it("medication treatment text is stored per diagnosis card only", () => {
    const form = formWithThreeSelected();
    const updatedDocs = form.diagnosisDocs.map((d) =>
      d.encounterDiagnosisId === "dx-2" ?
        { ...d, medicationTreatment: "Ibuprofen 400 mg PO q6h PRN pain" }
      : d
    );
    const next = { ...form, diagnosisDocs: updatedDocs };
    expect(findDiagnosisDocForRef(next, next.diagnosisRefs[1]!)!.medicationTreatment).toContain("Ibuprofen");
    expect(findDiagnosisDocForRef(next, next.diagnosisRefs[0]!)!.medicationTreatment).toContain("R07.9");
    expect(findDiagnosisDocForRef(next, next.diagnosisRefs[2]!)!.medicationTreatment).toContain("S01.01");
  });

  it("follow-up rows belong only to the active diagnosis card", () => {
    const form = formWithThreeSelected();
    const updatedDocs = form.diagnosisDocs.map((d) =>
      d.encounterDiagnosisId === "dx-3" ?
        {
          ...d,
          followUps: [
            {
              id: "fu-wound",
              specialty: "WOUND_CARE",
              providerOrFacility: "Clinic wound",
              timing: "3 days",
              phone: "",
              address: "",
              comments: "",
            },
          ],
        }
      : d
    );
    const next = { ...form, diagnosisDocs: updatedDocs };
    expect(findDiagnosisDocForRef(next, next.diagnosisRefs[2]!)!.followUps[0]?.specialty).toBe("WOUND_CARE");
    expect(findDiagnosisDocForRef(next, next.diagnosisRefs[0]!)!.followUps[0]?.specialty).toBe("PRIMARY_CARE");
  });

  it("blocks save when any selected diagnosis is missing description", () => {
    const form = formWithThreeSelected();
    form.diagnosisDocs[1]!.description = "";
    expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
  });

  it("blocks save when any selected diagnosis is missing diagnosis instructions", () => {
    const form = formWithThreeSelected();
    form.diagnosisDocs[0]!.diagnosisInstructions = "";
    expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
  });

  it("blocks save when any selected diagnosis is missing medication/treatment", () => {
    const form = formWithThreeSelected();
    form.diagnosisDocs[2]!.medicationTreatment = "  ";
    expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
  });

  it("blocks save when any selected diagnosis is missing return precautions", () => {
    const form = formWithThreeSelected();
    form.diagnosisDocs[1]!.returnPrecautions = "";
    expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
  });

  it("blocks save when follow-up row has specialty only without provider or timing", () => {
    const form = formWithThreeSelected();
    form.diagnosisDocs[0]!.followUps = [{ ...newDefaultFollowUpRow() }];
    expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
  });

  it("blocks save when any selected diagnosis is missing follow-up", () => {
    const form = formWithThreeSelected();
    form.diagnosisDocs[0]!.followUps = [];
    expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
  });

  it("returns inline field errors keyed by diagnosis doc id", () => {
    const form = formWithThreeSelected();
    form.diagnosisDocs[1]!.description = "";
    form.diagnosisDocs[1]!.medicationTreatment = "";
    const errors = validateProviderDischargeDocumentation(form, validationMessages);
    expect(errors?.byDocId["doc-2"]?.description).toBe(validationMessages.requiredDescription);
    expect(errors?.byDocId["doc-2"]?.medicationTreatment).toBe(validationMessages.requiredMedication);
  });

  it("does not require validation when no diagnosis is selected", () => {
    const form: ProviderDischargeDocumentationForm = {
      patientLeftEdAt: "",
      diagnosisRefs: [],
      diagnosisDocs: [],
    };
    expect(validateProviderDischargeDocumentation(form, validationMessages)).toBeNull();
  });

  it("allows save when all selected diagnosis cards are complete", () => {
    const form = formWithThreeSelected();
    expect(validateProviderDischargeDocumentation(form, validationMessages)).toBeNull();
  });

  it("hydrates legacy single shared fields into the first diagnosis card safely", () => {
    const form = hydrateProviderDischargeDocumentationForm({
      dischargeDiagnosisSummary: "Legacy description",
      dischargeInstructions: "Legacy instructions",
      medicationInstructions: "Legacy meds",
      returnPrecautions: "Legacy precautions",
      workSchoolNote: "Legacy work note",
      providerDischargeDiagnosisRefs: [
        { encounterDiagnosisId: "dx-legacy", code: "R07.9", label: "Chest pain", isPrimary: true },
      ],
      providerDischargeFollowUps: [
        { id: "1", specialty: "CARDIOLOGY", providerOrFacility: "Clinic", timing: "1 week", phone: "", address: "", comments: "" },
      ],
    });
    expect(form.diagnosisDocs).toHaveLength(1);
    expect(form.diagnosisDocs[0]!.description).toBe("Legacy description");
    expect(form.diagnosisDocs[0]!.diagnosisInstructions).toBe("Legacy instructions");
    expect(form.diagnosisDocs[0]!.medicationTreatment).toBe("Legacy meds");
    expect(form.diagnosisDocs[0]!.returnPrecautions).toBe("Legacy precautions");
    expect(form.diagnosisDocs[0]!.returnWorkSchool).toBe("Legacy work note");
    expect(form.diagnosisDocs[0]!.followUps).toHaveLength(1);
  });

  it("ED Summary renders per-diagnosis discharge documentation", () => {
    const form = formWithThreeSelected();
    const merged = mergeProviderDischargeDocumentationIntoDischargeJson(
      {},
      form,
      { documentedAt: "2026-05-18T18:00:00.000Z", documentedByDisplayName: "Dr A", documentedByTitle: "MD" }
    );
    const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en");
    expect(block?.lines.some((l) => l.includes("R07.9"))).toBe(true);
    expect(block?.lines.some((l) => l.includes("R10.9"))).toBe(true);
    expect(block?.lines.some((l) => l.includes("Description for S01.01"))).toBe(true);
    expect(block?.lines.some((l) => l.includes("Dr A"))).toBe(true);
  });

  it("ER Packet summary builder renders per-diagnosis discharge documentation", () => {
    const form = formWithThreeSelected();
    const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
      documentedAt: "2026-05-18T18:00:00.000Z",
      documentedByDisplayName: "Dr A",
    });
    const block = buildProviderDischargeDocumentationSummaryBlock(merged, "fr");
    expect(block?.title).toBeTruthy();
    expect(block?.lines.filter((l) => l.includes(" — ")).length).toBeGreaterThanOrEqual(3);
  });

  it("save merge writes structured per-diagnosis docs to discharge JSON", () => {
    const form = formWithThreeSelected();
    const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
      documentedAt: "2026-05-18T18:00:00.000Z",
      documentedByDisplayName: "Dr Test",
    });
    const docs = merged.providerDischargeDiagnosisDocs as unknown[];
    expect(Array.isArray(docs)).toBe(true);
    expect(docs).toHaveLength(3);
    expect(merged.dischargeDiagnosisSummary).toContain("R07.9");
    expect(merged.providerDischargeFollowUps).toBeUndefined();
    expect(merged.providerDischargeMedicationLines).toBeUndefined();
  });

  it("medication treatment text does not create order, eRx, or MAR identifiers", () => {
    const form = formWithThreeSelected();
    form.diagnosisDocs[0]!.medicationTreatment = "Ibuprofen 400 mg PO q6h PRN pain";
    const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
      documentedAt: new Date().toISOString(),
      documentedByDisplayName: "Dr Test",
    });
    const json = JSON.stringify(merged);
    expect(json).not.toContain('"orderId"');
    expect(json).not.toContain('"marAction"');
    expect(json).not.toContain('"eRx"');
  });

  it("deselecting a diagnosis preserves its card data for reselection in form state", () => {
    const form = formWithThreeSelected();
    const hiddenDoc = form.diagnosisDocs[2]!;
    hiddenDoc.description = "Preserved wound description";
    const deselected: ProviderDischargeDocumentationForm = {
      ...form,
      diagnosisRefs: form.diagnosisRefs.filter((r) => r.encounterDiagnosisId !== "dx-3"),
      diagnosisDocs: form.diagnosisDocs,
    };
    expect(getSelectedDiagnosisDocs(deselected)).toHaveLength(2);
    const preserved = deselected.diagnosisDocs.find((d) => d.encounterDiagnosisId === "dx-3");
    expect(preserved?.description).toBe("Preserved wound description");
  });

  it("follow-up supports multiple specialty rows per card", () => {
    expect(PROVIDER_DISCHARGE_FOLLOW_UP_SPECIALTIES.length).toBeGreaterThanOrEqual(10);
    const form = hydrateProviderDischargeDocumentationForm({
      providerDischargeDiagnosisDocs: [
        {
          id: "d1",
          code: "R07.9",
          displayName: "Chest pain",
          description: "x",
          diagnosisInstructions: "x",
          medicationTreatment: "x",
          returnPrecautions: "x",
          followUps: [
            { id: "1", specialty: "CARDIOLOGY", name: "Clinic", timing: "1 week", phone: "", address: "", comments: "" },
            { id: "2", specialty: "PRIMARY_CARE", name: "PCP", timing: "3 days", phone: "", address: "", comments: "" },
          ],
        },
      ],
      providerDischargeDiagnosisRefs: [{ code: "R07.9", label: "Chest pain", isPrimary: true }],
    });
    expect(form.diagnosisDocs[0]!.followUps).toHaveLength(2);
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
        providerDischargeDiagnosisDocs: [
          {
            id: "d1",
            code: "R07.9",
            displayName: "Chest pain",
            description: "Evaluated for chest pain.",
            diagnosisInstructions: "Rest.",
            medicationTreatment: "None",
            returnPrecautions: "Return if worse.",
            followUps: [{ id: "f1", specialty: "PRIMARY_CARE", name: "PCP", timing: "1 week", phone: "", address: "", comments: "" }],
          },
        ],
        providerDischargeDiagnosisRefs: [{ code: "R07.9", label: "Chest pain", isPrimary: true }],
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

  it("disposition panel keeps Primary Decision and validates before save", () => {
    const source = readFileSync(join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"), "utf8");
    expect(source).toContain("sectionPrimaryDecision");
    expect(source).toContain("ProviderDischargeDocumentationSection");
    expect(source).toContain("validateProviderDischargeDocumentation");
    expect(source).toContain("setProviderDischargeValidationErrors");
    expect(source).not.toContain("PatientDischargeInstructionsClosureCard");
  });

  it("disposition save returns early before apiFetch when provider discharge validation fails", () => {
    const source = readFileSync(join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"), "utf8");
    const validationIdx = source.indexOf("validateProviderDischargeDocumentation");
    const saveApiIdx = source.indexOf("apiFetch(`/encounters/${encounterId}`");
    expect(validationIdx).toBeGreaterThan(-1);
    expect(saveApiIdx).toBeGreaterThan(validationIdx);
    expect(source).toContain("setProviderDischargeValidationErrors(validationErrors)");
  });

  it("provider discharge section renders independent diagnosis cards", () => {
    const source = readFileSync(
      join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
      "utf8"
    );
    expect(source).toContain("DiagnosisDocumentationCard");
    expect(source).toContain("selectedCards.map");
    expect(source).not.toContain("providerForm.description");
    expect(source).not.toContain("providerForm.followUpRows");
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

  it("chart export raw JSON path includes providerDischargeDiagnosisDocs via dischargeSummaryJson", () => {
    const chartExport = readFileSync(
      join(webRoot, "../api/src/encounters/chart-export.service.ts"),
      "utf8"
    );
    expect(chartExport).toContain("dischargeSummaryJson");
  });

  it("instructional chrome regression gate file still exists", () => {
    const gate = readFileSync(
      join(webRoot, "src/i18n/messages/instructionalChrome.test.ts"),
      "utf8"
    );
    expect(gate).toContain("instructionalChrome");
  });

  it("English and French provider discharge i18n include required field labels", () => {
    const en = readFileSync(join(webRoot, "src/i18n/messages/providerDischargeDocumentation19Y.en.ts"), "utf8");
    const fr = readFileSync(join(webRoot, "src/i18n/messages/providerDischargeDocumentation19Y.fr.ts"), "utf8");
    expect(en).toContain("descriptionRequired");
    expect(en).toContain("saveBlocked");
    expect(fr).toContain("descriptionRequired");
    expect(fr).toContain("saveBlocked");
  });

  it("billing capture module is unchanged by provider discharge documentation", () => {
    const billing = readFileSync(join(webRoot, "../../packages/shared/src/billingCaptureV1.ts"), "utf8");
    expect(billing).not.toContain("providerDischargeDiagnosisDocs");
    expect(billing).toContain("buildEncounterDispositionCandidate");
  });
});
