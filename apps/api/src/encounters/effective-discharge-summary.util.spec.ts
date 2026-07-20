import { mergeDischargeSummaryJson } from "./effective-discharge-summary.util";
import {
  hasClosureAdequateDischargeInstructions,
  hasClosureFollowUpDocumented,
  hasClosurePatientInstructionsExplained,
  hasClosureReturnPrecautionsDocumented,
} from "@medora/shared";
import { computeDispositionSafetyReadiness } from "./disposition-safety-readiness.util";
import { EncounterStatus, EncounterType } from "@prisma/client";

/** Screenshot-equivalent: structured follow-up + instruction content, communication unchecked. */
const screenshotEquivalentPersisted = {
  dischargeMode: "Domicile",
  dischargeDiagnosisSummary:
    "You were evaluated in the emergency department for chest pain. Outpatient follow-up is recommended.",
  dischargeInstructions:
    "Rest as needed. Take medications only as prescribed. Return precautions were reviewed.",
  medicationInstructions: "Take medications only as prescribed or directed by your clinician.",
  returnPrecautions:
    "Return to the ED or call emergency services for worsening chest pain, shortness of breath, or fainting.",
  workSchoolNote: "Return to work or school when you feel able. May return in 2 days.",
  // Rollup intentionally absent — mirrors charts where only structured arrays remain.
  providerDischargeFollowUps: [
    {
      id: "fu-1",
      specialty: "PRIMARY_CARE",
      name: "Dr. Mauramcebaum",
      providerOrFacility: "Dr. Mauramcebaum",
      timing: "within 1-2 days",
      phone: "468-890-2345",
      address: "",
      comments: "",
    },
  ],
  providerDischargeDiagnosisDocs: [
    {
      id: "doc-1",
      code: "R07.9",
      displayName: "Chest pain, unspecified",
      description:
        "You were evaluated in the emergency department for chest pain. Outpatient follow-up is recommended.",
      diagnosisInstructions:
        "Rest as needed. Take medications only as prescribed. Return precautions were reviewed.",
      medicationTreatment: "Take medications only as prescribed or directed by your clinician.",
    },
  ],
  providerDischargeReturnPrecautions:
    "Return to the ED or call emergency services for worsening chest pain, shortness of breath, or fainting.",
  providerDischargeReturnWorkSchool:
    "Return to work or school when you feel able. May return in 2 days.",
};

describe("mergeDischargeSummaryJson (disposition certification source reconciliation)", () => {
  it("preserves structured follow-up arrays for readiness (screenshot-equivalent)", () => {
    const merged = mergeDischargeSummaryJson(screenshotEquivalentPersisted, undefined);
    expect(merged).toBeDefined();
    expect(Array.isArray(merged!.providerDischargeFollowUps)).toBe(true);
    expect(hasClosureFollowUpDocumented(merged)).toBe(true);
    expect(hasClosureAdequateDischargeInstructions(merged, false)).toBe(true);
    expect(hasClosureReturnPrecautionsDocumented(merged)).toBe(true);
    expect(hasClosurePatientInstructionsExplained(merged)).toBe(false);
  });

  it("does not emit follow-up missing when only structured rows exist", () => {
    const merged = mergeDischargeSummaryJson(screenshotEquivalentPersisted, undefined);
    const result = computeDispositionSafetyReadiness({
      encounter: {
        type: EncounterType.EMERGENCY,
        status: EncounterStatus.OPEN,
        nursingAssessment: {},
        dischargeSummaryJson: screenshotEquivalentPersisted,
        admissionSummaryJson: {},
        providerDocumentationStatus: "SIGNED",
        providerDocumentationSignedAt: new Date("2026-07-03T04:04:00.000Z"),
        providerNote: "HPI",
        treatmentPlan: null,
      },
      effectiveDischargeSummary: merged,
      patientLatestVitalsAt: new Date("2026-07-03T03:00:00.000Z"),
      latestTriageVitalsRecordedAt: null,
      latestVitalsClinicalEventAt: null,
      orders: [],
      now: new Date("2026-07-03T04:30:00.000Z"),
    });
    const codes = result.blockers.map((b) => b.code);
    expect(codes).not.toContain("DISCHARGE_FOLLOW_UP_MISSING");
    expect(codes).not.toContain("DISCHARGE_INSTRUCTIONS_MISSING");
    expect(codes).toContain("DISCHARGE_INSTRUCTIONS_NOT_GIVEN");
  });

  it("incoming empty followUp string does not drop structured arrays", () => {
    const merged = mergeDischargeSummaryJson(screenshotEquivalentPersisted, {
      followUp: "",
      dischargeMode: "Domicile",
    });
    expect(hasClosureFollowUpDocumented(merged)).toBe(true);
  });
});
