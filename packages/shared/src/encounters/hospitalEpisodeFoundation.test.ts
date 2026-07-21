import { describe, expect, it } from "vitest";
import {
  ED_DISCHARGE_MODE_ADMISSION,
  ED_DISCHARGE_MODE_HOME,
  ED_DISCHARGE_MODE_TRANSFER,
} from "./edEncounterLifecycle.js";
import { EdDispositionDocumentationStatus } from "./edDispositionDecisionV1.js";
import {
  HospitalEpisodeEligibilityDenialReason,
  hospitalEpisodeRemainsActiveAfterEdEncounterClose,
  validateHospitalEpisodeEncounterEligibility,
} from "./hospitalEpisodeEligibility.js";
import {
  hospitalEpisodeFoundationEnabled,
  HOSPITAL_EPISODE_FOUNDATION_FLAG,
} from "./hospitalEpisodeFoundationFeatureFlag.js";
import { projectHospitalEpisodeState } from "./hospitalEpisodeProjection.js";
import { OBSERVATION_SHORT_STAY_CARE_LEVEL_OPTION_FR } from "../observationAdmissionCareLevel.js";

function signedAdmissionNursing() {
  return {
    erDispositionV1: {
      documentationStatus: EdDispositionDocumentationStatus.SIGNED,
      signedAt: "2026-07-20T12:00:00.000Z",
      signedByDisplayName: "Dr Test",
      revision: 1,
    },
  };
}

function draftAdmissionNursing() {
  return {
    erDispositionV1: {
      documentationStatus: EdDispositionDocumentationStatus.DRAFT,
      revision: 0,
    },
  };
}

describe("hospitalEpisodeFoundationFeatureFlag", () => {
  it("defaults OFF", () => {
    expect(hospitalEpisodeFoundationEnabled()).toBe(false);
    expect(hospitalEpisodeFoundationEnabled({})).toBe(false);
    expect(HOSPITAL_EPISODE_FOUNDATION_FLAG).toBe("hospitalEpisodeFoundationEnabled");
  });

  it("enables on truthy env", () => {
    expect(
      hospitalEpisodeFoundationEnabled({ HOSPITAL_EPISODE_FOUNDATION_ENABLED: "true" })
    ).toBe(true);
  });
});

describe("validateHospitalEpisodeEncounterEligibility", () => {
  it("denies when feature flag OFF", () => {
    const r = validateHospitalEpisodeEncounterEligibility({
      id: "e1",
      type: "EMERGENCY",
      facilityId: "f1",
      patientId: "p1",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
      admissionSummaryJson: { careLevel: "Médecine" },
      nursingAssessment: signedAdmissionNursing(),
      featureFlagEnabled: false,
    });
    expect(r.eligible).toBe(false);
    expect(r.denialReason).toBe(HospitalEpisodeEligibilityDenialReason.FEATURE_FLAG_OFF);
  });

  it("denies draft admission decision", () => {
    const r = validateHospitalEpisodeEncounterEligibility({
      id: "e1",
      type: "EMERGENCY",
      facilityId: "f1",
      patientId: "p1",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
      admissionSummaryJson: { careLevel: "Médecine" },
      nursingAssessment: draftAdmissionNursing(),
      featureFlagEnabled: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.denialReason).toBe(HospitalEpisodeEligibilityDenialReason.DECISION_DRAFT);
  });

  it("denies signed home discharge", () => {
    const r = validateHospitalEpisodeEncounterEligibility({
      id: "e1",
      type: "EMERGENCY",
      facilityId: "f1",
      patientId: "p1",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
      nursingAssessment: signedAdmissionNursing(),
      featureFlagEnabled: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.denialReason).toBe(HospitalEpisodeEligibilityDenialReason.HOME_DISCHARGE);
  });

  it("denies signed external transfer", () => {
    const r = validateHospitalEpisodeEncounterEligibility({
      id: "e1",
      type: "EMERGENCY",
      facilityId: "f1",
      patientId: "p1",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_TRANSFER },
      nursingAssessment: signedAdmissionNursing(),
      featureFlagEnabled: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.denialReason).toBe(HospitalEpisodeEligibilityDenialReason.EXTERNAL_TRANSFER);
  });

  it("allows signed internal admission", () => {
    const r = validateHospitalEpisodeEncounterEligibility({
      id: "e1",
      type: "EMERGENCY",
      facilityId: "f1",
      patientId: "p1",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
      admissionSummaryJson: { careLevel: "Médecine" },
      nursingAssessment: signedAdmissionNursing(),
      featureFlagEnabled: true,
    });
    expect(r.eligible).toBe(true);
    expect(r.internalPlacementKind).toBe("INPATIENT_ADMISSION");
  });

  it("allows signed observation eligibility", () => {
    const r = validateHospitalEpisodeEncounterEligibility({
      id: "e1",
      type: "EMERGENCY",
      facilityId: "f1",
      patientId: "p1",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
      admissionSummaryJson: { careLevel: OBSERVATION_SHORT_STAY_CARE_LEVEL_OPTION_FR },
      nursingAssessment: signedAdmissionNursing(),
      featureFlagEnabled: true,
    });
    expect(r.eligible).toBe(true);
    expect(r.internalPlacementKind).toBe("OBSERVATION");
  });

  it("denies already linked", () => {
    const r = validateHospitalEpisodeEncounterEligibility({
      id: "e1",
      type: "EMERGENCY",
      hospitalEpisodeId: "he1",
      facilityId: "f1",
      patientId: "p1",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
      admissionSummaryJson: { careLevel: "Médecine" },
      nursingAssessment: signedAdmissionNursing(),
      featureFlagEnabled: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.denialReason).toBe(HospitalEpisodeEligibilityDenialReason.ALREADY_LINKED);
  });

  it("denies patient/facility mismatch", () => {
    const r = validateHospitalEpisodeEncounterEligibility({
      id: "e1",
      type: "EMERGENCY",
      facilityId: "f1",
      patientId: "p1",
      expectedFacilityId: "f2",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
      admissionSummaryJson: { careLevel: "Médecine" },
      nursingAssessment: signedAdmissionNursing(),
      featureFlagEnabled: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.denialReason).toBe(HospitalEpisodeEligibilityDenialReason.PATIENT_FACILITY_MISMATCH);
  });

  it("denies non-ED encounter type", () => {
    const r = validateHospitalEpisodeEncounterEligibility({
      id: "e1",
      type: "OUTPATIENT",
      facilityId: "f1",
      patientId: "p1",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
      admissionSummaryJson: { careLevel: "Médecine" },
      nursingAssessment: signedAdmissionNursing(),
      featureFlagEnabled: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.denialReason).toBe(HospitalEpisodeEligibilityDenialReason.NOT_ED_ENCOUNTER);
  });
});

describe("hospitalEpisode lifecycle vs ED close", () => {
  it("episode remains ACTIVE after ED encounter closes", () => {
    expect(
      hospitalEpisodeRemainsActiveAfterEdEncounterClose({
        episodeStatus: "ACTIVE",
        encounterStatus: "CLOSED",
      })
    ).toBe(true);
  });

  it("does not treat episode CLOSED as remaining active", () => {
    expect(
      hospitalEpisodeRemainsActiveAfterEdEncounterClose({
        episodeStatus: "CLOSED",
        encounterStatus: "CLOSED",
      })
    ).toBe(false);
  });
});

describe("projectHospitalEpisodeState", () => {
  it("returns null when absent", () => {
    expect(projectHospitalEpisodeState(null)).toBeNull();
  });

  it("projects safe episode state without PHI narrative", () => {
    const p = projectHospitalEpisodeState({
      id: "he1",
      facilityId: "f1",
      patientId: "p1",
      status: "ACTIVE",
      openedAt: "2026-07-20T10:00:00.000Z",
      closedAt: null,
      closeReason: null,
      originatingEncounterId: "e1",
      version: 1,
      encounters: [{ id: "e1" }],
    });
    expect(p).toMatchObject({
      id: "he1",
      facilityId: "f1",
      patientId: "p1",
      status: "ACTIVE",
      originatingEncounterId: "e1",
      encounterIds: ["e1"],
      edEncounterCloseClosesEpisode: false,
    });
  });
});
