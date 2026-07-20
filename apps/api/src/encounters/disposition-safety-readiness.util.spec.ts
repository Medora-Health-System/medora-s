import { EncounterStatus, EncounterType } from "@prisma/client";
import { computeDispositionSafetyReadiness } from "./disposition-safety-readiness.util";

const NOW = new Date("2026-06-23T12:00:00.000Z");
const RECENT_VITALS = new Date("2026-06-23T11:30:00.000Z");
const STALE_VITALS = new Date("2026-06-23T06:00:00.000Z");

const providerDischargeSummary = {
  dischargeMode: "Domicile",
  dischargeDiagnosisSummary: "Acute bronchitis",
  dischargeInstructions: "Rest and fluids",
  medicationInstructions: "Albuterol inhaler PRN",
  providerDischargeReturnPrecautions: "Return if worsening shortness of breath",
  providerDischargeReturnWorkSchool: "May return to work in 2 days",
  providerDischargeFollowUps: [
    {
      id: "fu-1",
      specialty: "PRIMARY_CARE",
      providerOrFacility: "Dr Smith",
      timing: "Within 3 days",
      phone: "555-0100",
    },
  ],
  providerDischargeDiagnosisDocs: [
    {
      id: "doc-1",
      code: "J20.9",
      displayName: "Acute bronchitis",
      description: "Acute bronchitis",
      diagnosisInstructions: "Rest and fluids",
      medicationTreatment: "Albuterol inhaler PRN",
      returnPrecautions: "Return if worsening shortness of breath",
    },
  ],
  patientInstructionsGiven: true,
};

function baseEncounter(overrides: Record<string, unknown> = {}) {
  return {
    type: EncounterType.EMERGENCY,
    status: EncounterStatus.OPEN,
    nursingAssessment: {},
    dischargeSummaryJson: {},
    admissionSummaryJson: {},
    providerDocumentationStatus: "DRAFT",
    providerDocumentationSignedAt: null,
    providerNote: "HPI documented",
    treatmentPlan: null,
    ...overrides,
  };
}

function readiness(
  effectiveDischargeSummary: Record<string, unknown> | undefined,
  encounterOverrides: Record<string, unknown> = {},
  vitalsAt: Date | null = RECENT_VITALS
) {
  return computeDispositionSafetyReadiness({
    encounter: baseEncounter(encounterOverrides),
    effectiveDischargeSummary,
    patientLatestVitalsAt: vitalsAt,
    latestTriageVitalsRecordedAt: null,
    latestVitalsClinicalEventAt: null,
    orders: [],
    now: NOW,
  });
}

function blockerCodes(result: ReturnType<typeof computeDispositionSafetyReadiness>): string[] {
  return result.blockers.map((b) => b.code);
}

describe("computeDispositionSafetyReadiness (closure discharge sync)", () => {
  it("blocks home discharge when provider discharge sections are empty", () => {
    const result = readiness({ dischargeMode: "Domicile" });
    expect(blockerCodes(result)).toEqual(
      expect.arrayContaining([
        "DISCHARGE_INSTRUCTIONS_MISSING",
        "DISCHARGE_RETURN_PRECAUTIONS_MISSING",
        "DISCHARGE_FOLLOW_UP_MISSING",
        "DISCHARGE_INSTRUCTIONS_NOT_GIVEN",
        "PROVIDER_DOCUMENTATION_UNSIGNED",
      ])
    );
  });

  it("clears discharge instruction blockers when provider discharge payload is complete", () => {
    const result = readiness(providerDischargeSummary);
    const codes = blockerCodes(result);
    expect(codes).not.toContain("DISCHARGE_INSTRUCTIONS_MISSING");
    expect(codes).not.toContain("DISCHARGE_RETURN_PRECAUTIONS_MISSING");
    expect(codes).not.toContain("DISCHARGE_FOLLOW_UP_MISSING");
    expect(codes).not.toContain("DISCHARGE_INSTRUCTIONS_NOT_GIVEN");
    expect(codes).toContain("PROVIDER_DOCUMENTATION_UNSIGNED");
  });

  it("clears follow-up blocker for narrative follow-up text", () => {
    const result = readiness({
      dischargeMode: "Domicile",
      dischargeDiagnosisSummary: "Test",
      dischargeInstructions: "Instructions",
      returnPrecautions: "Return if worse",
      followUp: "PCP in 1 week — 555-0100",
      patientInstructionsGiven: true,
    });
    expect(blockerCodes(result)).not.toContain("DISCHARGE_FOLLOW_UP_MISSING");
  });

  it("screenshot-equivalent: structured follow-up + content present, communication unchecked → only NOT_GIVEN", () => {
    const result = readiness({
      dischargeMode: "Domicile",
      dischargeDiagnosisSummary: "Chest pain evaluation",
      dischargeInstructions: "Rest as needed.",
      medicationInstructions: "Take as prescribed.",
      returnPrecautions: "Return for worsening chest pain.",
      workSchoolNote: "May return in 2 days.",
      providerDischargeFollowUps: [
        {
          id: "fu-1",
          specialty: "PRIMARY_CARE",
          providerOrFacility: "Dr. Mauramcebaum",
          timing: "within 1-2 days",
          phone: "468-890-2345",
        },
      ],
      // checkbox absent / false
    });
    const codes = blockerCodes(result);
    expect(codes).not.toContain("DISCHARGE_FOLLOW_UP_MISSING");
    expect(codes).not.toContain("DISCHARGE_INSTRUCTIONS_MISSING");
    expect(codes).not.toContain("DISCHARGE_RETURN_PRECAUTIONS_MISSING");
    expect(codes).toContain("DISCHARGE_INSTRUCTIONS_NOT_GIVEN");
  });

  it("does not apply home-discharge instruction/follow-up rules on admission", () => {
    const result = readiness({
      dischargeMode: "Admission / hospitalisation",
    });
    const codes = blockerCodes(result);
    expect(codes).not.toContain("DISCHARGE_FOLLOW_UP_MISSING");
    expect(codes).not.toContain("DISCHARGE_INSTRUCTIONS_MISSING");
    expect(codes).not.toContain("DISCHARGE_INSTRUCTIONS_NOT_GIVEN");
  });

  it("does not apply home-discharge instruction/follow-up rules on transfer", () => {
    const result = readiness({
      dischargeMode: "Transfert vers un autre établissement",
    });
    const codes = blockerCodes(result);
    expect(codes).not.toContain("DISCHARGE_FOLLOW_UP_MISSING");
    expect(codes).not.toContain("DISCHARGE_INSTRUCTIONS_NOT_GIVEN");
  });

  it("keeps provider signature blocker until documentation is signed", () => {
    const unsigned = readiness(providerDischargeSummary);
    expect(blockerCodes(unsigned)).toContain("PROVIDER_DOCUMENTATION_UNSIGNED");

    const signed = readiness(providerDischargeSummary, {
      providerDocumentationStatus: "SIGNED",
      providerDocumentationSignedAt: NOW,
    });
    expect(blockerCodes(signed)).not.toContain("PROVIDER_DOCUMENTATION_UNSIGNED");
  });

  it("blocks when vitals are older than 4 hours", () => {
    const stale = readiness(providerDischargeSummary, {}, STALE_VITALS);
    expect(blockerCodes(stale)).toContain("VITALS_STALE");

    const fresh = readiness(providerDischargeSummary, {}, RECENT_VITALS);
    expect(blockerCodes(fresh)).not.toContain("VITALS_STALE");
  });

  it("clears instructions-explained blocker only when checkbox is set", () => {
    const unchecked = readiness({
      ...providerDischargeSummary,
      patientInstructionsGiven: false,
    });
    expect(blockerCodes(unchecked)).toContain("DISCHARGE_INSTRUCTIONS_NOT_GIVEN");

    const checked = readiness(providerDischargeSummary);
    expect(blockerCodes(checked)).not.toContain("DISCHARGE_INSTRUCTIONS_NOT_GIVEN");
  });
});
