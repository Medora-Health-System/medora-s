import { describe, expect, it } from "vitest";
import {
  emptyProviderDischargeDocumentationForm,
  normalizeProviderDischargeDiagnosisCards,
  newDefaultFollowUpRow,
  applyProviderDischargeDocumentationToDischargeForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  mergeCanonicalErDispositionIntoDischargeJson,
} from "./providerDischargeDocumentationModel";
import { buildProviderDischargeJsonForSave } from "./ProviderDischargeDocumentationSection";
import { emptyDischargeForm } from "@/lib/encounterDischarge";
import { mergeErDischargeForEncounterPatch } from "./emergencyDispositionV1";
import {
  hasClosureFollowUpDocumented,
  hasClosureAdequateDischargeInstructions,
  hasClosurePatientInstructionsExplained,
  hasClosureReturnPrecautionsDocumented,
  resolveHomeDischargeDocumentationState,
} from "@medora/shared";

/** Production-like chest-pain home discharge (Ericka Chapman screenshot equivalent). */
function screenshotEquivalentForm() {
  return normalizeProviderDischargeDiagnosisCards({
    ...emptyProviderDischargeDocumentationForm(),
    patientLeftEdAt: "2026-07-03T03:54:00.000Z",
    diagnosisRefs: [
      {
        encounterDiagnosisId: "dx-1",
        code: "R07.9",
        label: "Chest pain, unspecified",
        isPrimary: true,
      },
    ],
    diagnosisDocs: [
      {
        id: "doc-1",
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain, unspecified",
        isPrimaryDiagnosis: true,
        displayOrder: 0,
        description:
          "You were evaluated in the emergency department for chest pain. Outpatient follow-up is recommended.",
        diagnosisInstructions:
          "Rest as needed. Take medications only as prescribed. Return precautions were reviewed.",
        medicationTreatment: "Take medications only as prescribed or directed by your clinician.",
        returnPrecautions: "",
        followUps: [],
        medicationLines: [],
      },
    ],
    returnPrecautions:
      "Return to the ED or call emergency services for worsening chest pain, shortness of breath, or fainting.",
    returnWorkSchool: "Return to work or school when you feel able. May return in 2 days.",
    followUps: [
      {
        ...newDefaultFollowUpRow(),
        specialty: "PRIMARY_CARE",
        providerOrFacility: "Dr. Mauramcebaum",
        timing: "within 1-2 days",
        phone: "468-890-2345",
      },
    ],
    patientInstructionsGiven: false,
  });
}

describe("discharge certification source reconciliation (screenshot regression)", () => {
  it("full save preserves structured follow-up; communication unchecked → content OK / follow-up OK / explained false", () => {
    const form = screenshotEquivalentForm();
    const dischargeForm = applyProviderDischargeDocumentationToDischargeForm(
      emptyDischargeForm(),
      form
    );
    expect(dischargeForm.followUp).toContain("Dr. Mauramcebaum");

    const canonical = mergeErDischargeForEncounterPatch({}, dischargeForm, true, true, "HOME");
    const saved = buildProviderDischargeJsonForSave(
      {},
      form,
      { documentedAt: "2026-07-03T04:04:00.000Z", documentedByDisplayName: "Rajnil Shah" },
      canonical
    );

    expect(hasClosureFollowUpDocumented(saved)).toBe(true);
    expect(hasClosureAdequateDischargeInstructions(saved, false)).toBe(true);
    expect(hasClosureReturnPrecautionsDocumented(saved)).toBe(true);
    expect(hasClosurePatientInstructionsExplained(saved)).toBe(false);

    const state = resolveHomeDischargeDocumentationState(saved, { hasMedicationOrders: false });
    expect(state.planning.followUpPresent).toBe(true);
    expect(state.instructionContentAdequate).toBe(true);
    expect(state.communication.instructionsCommunicated).toBe("UNKNOWN");
  });

  it("structured follow-up without flat rollup still satisfies follow-up (arrays-only chart)", () => {
    const form = screenshotEquivalentForm();
    const providerOnly = mergeProviderDischargeDocumentationIntoDischargeJson({}, form);
    delete providerOnly.followUp;
    delete providerOnly.followUpInstructions;

    expect(hasClosureFollowUpDocumented(providerOnly)).toBe(true);
    const state = resolveHomeDischargeDocumentationState(providerOnly);
    expect(state.planning.followUpPresent).toBe(true);
    expect(state.planning.followUpComponents.providerPresent).toBe(true);
    expect(state.planning.followUpComponents.timeframePresent).toBe(true);
    expect(state.planning.followUpComponents.contactPresent).toBe(true);
  });

  it("canonical overlay does not wipe provider followUp rollup when form followUp was empty historically", () => {
    const form = screenshotEquivalentForm();
    const providerJson = mergeProviderDischargeDocumentationIntoDischargeJson({}, form);
    expect(typeof providerJson.followUp).toBe("string");

    const wipedCanonical = {
      dischargeMode: "Domicile",
      disposition: String(providerJson.disposition ?? ""),
      followUp: "",
    };
    const merged = mergeCanonicalErDispositionIntoDischargeJson(providerJson, wipedCanonical);
    expect(merged.followUp).toBe(providerJson.followUp);
    expect(hasClosureFollowUpDocumented(merged)).toBe(true);
  });

  it("checking instructions-explained flips communication state only", () => {
    const unchecked = screenshotEquivalentForm();
    const checked = { ...unchecked, patientInstructionsGiven: true };
    const savedUnchecked = mergeProviderDischargeDocumentationIntoDischargeJson({}, unchecked);
    const savedChecked = mergeProviderDischargeDocumentationIntoDischargeJson({}, checked);

    expect(hasClosurePatientInstructionsExplained(savedUnchecked)).toBe(false);
    expect(hasClosurePatientInstructionsExplained(savedChecked)).toBe(true);
    expect(hasClosureFollowUpDocumented(savedUnchecked)).toBe(true);
    expect(hasClosureFollowUpDocumented(savedChecked)).toBe(true);
  });
});
