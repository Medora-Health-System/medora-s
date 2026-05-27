import { describe, expect, it } from "vitest";
import {
  emptyTriageCarryForwardDraft,
  mergeCarryForwardIntoNewTriage,
  TRIAGE_CARRY_FORWARD_VERSION,
  type TriageCarryForwardMeta,
} from "../triage/triageCarryForward.js";
import {
  buildPatientHistoryReconciliationAuditMetadata,
  compareEncounterDraftWithProfile,
  emptyPatientClinicalHistoryProfile,
  patientClinicalHistoryProfileFromJson,
  profileHasClinicalContent,
  profileToCarryForwardExtraction,
  profileToTriageDraft,
  reconcileEncounterHistoryIntoPatientProfile,
  type PatientClinicalHistoryProfile,
} from "./patientClinicalHistoryProfile.js";

const ENCOUNTER_ID = "enc-current-001";
const FACILITY_ID = "facility-001";
const NOW = "2026-05-18T14:00:00.000Z";

function fullDraft() {
  const d = emptyTriageCarryForwardDraft();
  d.allergyNote = "Pénicilline";
  d.erV1.medicationAllergiesDetail = "Pénicilline";
  d.erV1.medicationsSummary = "Metformine";
  d.erV1.pastMedicalHistory = "Diabète";
  d.erV1.pastSurgicalHistory = "Appendicectomie";
  d.erV1.smokingStatus = "Former smoker";
  d.erV1.alcoholUse = "Occasional";
  return d;
}

function metaWithSectionStatus(
  sectionStatus: TriageCarryForwardMeta["sectionStatus"]
): TriageCarryForwardMeta {
  return {
    version: TRIAGE_CARRY_FORWARD_VERSION,
    sourceEncounterId: "enc-prior",
    sourceEncounterDate: "2025-12-01T00:00:00.000Z",
    carriedForwardAt: NOW,
    fields: {
      allergies: true,
      homeMedications: true,
      medicalHistory: true,
      surgicalHistory: true,
      smokingHistory: true,
      alcoholUse: true,
    },
    reviewStatus: "pending_review",
    sectionStatus,
  };
}

describe("patientClinicalHistoryProfile (19T.3)", () => {
  it("promotes reviewed allergies to patient profile", () => {
    const draft = fullDraft();
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: draft,
      carryForwardMeta: metaWithSectionStatus({ allergies: "reviewed" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      reviewerId: "rn-1",
      timestamp: NOW,
    });
    expect(result.sectionActions.allergies).toBe("promoted");
    expect(result.profile?.allergies?.allergyNote).toBe("Pénicilline");
    expect(result.profile?.provenance.allergies?.sourceType).toBe("reviewed_triage");
  });

  it("does not promote pending-review allergies", () => {
    const draft = fullDraft();
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: draft,
      carryForwardMeta: metaWithSectionStatus({ allergies: "pending_review" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    expect(result.sectionActions.allergies).toBe("skipped_pending");
    expect(result.profile).toBeNull();
  });

  it("promotes reviewed medications", () => {
    const draft = fullDraft();
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: draft,
      carryForwardMeta: metaWithSectionStatus({ homeMedications: "reviewed" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    expect(result.sectionActions.homeMedications).toBe("promoted");
    expect(result.profile?.homeMedications?.medicationsSummary).toBe("Metformine");
  });

  it("promotes reviewed PMH and PSH", () => {
    const draft = fullDraft();
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: draft,
      carryForwardMeta: metaWithSectionStatus({ history: "reviewed" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    expect(result.sectionActions.medicalHistory).toBe("promoted");
    expect(result.sectionActions.surgicalHistory).toBe("promoted");
    expect(result.profile?.medicalHistory?.pastMedicalHistory).toBe("Diabète");
    expect(result.profile?.surgicalHistory?.pastSurgicalHistory).toBe("Appendicectomie");
  });

  it("promotes reviewed social history", () => {
    const draft = fullDraft();
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: draft,
      carryForwardMeta: metaWithSectionStatus({ socialHistory: "reviewed" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    expect(result.sectionActions.socialHistory).toBe("promoted");
    expect(result.profile?.socialHistory?.smokingStatus).toBe("Former smoker");
  });

  it("does not clear patient profile when removed status lacks explicit confirmation", () => {
    const existing: PatientClinicalHistoryProfile = {
      ...emptyPatientClinicalHistoryProfile(NOW),
      allergies: { allergyNote: "Old allergy" },
      provenance: {
        allergies: {
          sourceType: "reviewed_triage",
          sourceEncounterId: "enc-old",
          lastReviewedAt: NOW,
        },
      },
    };
    const draft = fullDraft();
    draft.allergyNote = "";
    draft.erV1.medicationAllergiesDetail = "";

    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: existing,
      encounterDraft: draft,
      carryForwardMeta: metaWithSectionStatus({ allergies: "removed" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    expect(result.profile?.allergies?.allergyNote).toBe("Old allergy");
    expect(result.sectionActions.allergies).toBe("skipped_pending");
  });

  it("clears patient profile when removed status is explicitly confirmed", () => {
    const existing: PatientClinicalHistoryProfile = {
      ...emptyPatientClinicalHistoryProfile(NOW),
      allergies: { allergyNote: "Old allergy" },
      provenance: {
        allergies: {
          sourceType: "reviewed_triage",
          sourceEncounterId: "enc-old",
          lastReviewedAt: NOW,
        },
      },
    };
    const draft = fullDraft();
    draft.allergyNote = "";
    draft.erV1.medicationAllergiesDetail = "";

    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: existing,
      encounterDraft: draft,
      carryForwardMeta: metaWithSectionStatus({ allergies: "removed" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
      confirmRemovedSections: ["allergies"],
    });
    expect(result.sectionActions.allergies).toBe("removed");
    expect(result.profile?.allergies).toBeUndefined();
  });

  it("does not promote pending-review sections", () => {
    const draft = fullDraft();
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: draft,
      carryForwardMeta: metaWithSectionStatus({ allergies: "pending_review" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    expect(result.sectionActions.allergies).toBe("skipped_pending");
    expect(result.profile).toBeNull();
  });

  it("promotes modified sections as reconciled_update", () => {
    const draft = fullDraft();
    draft.allergyNote = "Changed allergy";
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: draft,
      carryForwardMeta: metaWithSectionStatus({ allergies: "modified" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    expect(result.sectionActions.allergies).toBe("promoted");
    expect(result.profile?.provenance.allergies?.sourceType).toBe("reconciled_update");
  });

  it("does not mutate historical encounter data during reconciliation", () => {
    const priorVitals = {
      allergyNote: "Prior only",
      medoraErTriageV1: { medicationsSummary: "Prior med" },
    };
    const priorCopy = JSON.parse(JSON.stringify(priorVitals));
    reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: fullDraft(),
      carryForwardMeta: metaWithSectionStatus({ allergies: "reviewed" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    expect(priorVitals).toEqual(priorCopy);
  });

  it("manual encounter edits override prior profile values", () => {
    const existing: PatientClinicalHistoryProfile = {
      ...emptyPatientClinicalHistoryProfile(NOW),
      allergies: { allergyNote: "Old" },
      provenance: { allergies: { sourceType: "reviewed_triage" } },
    };
    const draft = fullDraft();
    draft.allergyNote = "New manual allergy";
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: existing,
      encounterDraft: draft,
      carryForwardMeta: null,
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    expect(result.profile?.allergies?.allergyNote).toBe("New manual allergy");
    expect(result.profile?.provenance.allergies?.sourceType).toBe("manually_entered");
  });

  it("hydrates carry-forward extraction from longitudinal profile first", () => {
    const profile: PatientClinicalHistoryProfile = {
      ...emptyPatientClinicalHistoryProfile(NOW),
      allergies: { allergyNote: "Profile allergy" },
      homeMedications: { medicationsSummary: "Profile med" },
      provenance: {},
    };
    const extraction = profileToCarryForwardExtraction(profile);
    expect(extraction?.allergyNote).toBe("Profile allergy");
    expect(extraction?.fields.medicationsSummary).toBe("Profile med");
    const { draft } = mergeCarryForwardIntoNewTriage(emptyTriageCarryForwardDraft(), extraction!, {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: "patient-profile",
      sourceEncounterDate: NOW,
      carriedForwardAt: NOW,
    });
    expect(draft.allergyNote).toBe("Profile allergy");
  });

  it("fallback prior reviewed encounter merge still works", () => {
    const extraction = profileToCarryForwardExtraction({
      ...emptyPatientClinicalHistoryProfile(NOW),
      medicalHistory: { pastMedicalHistory: "HTA" },
      provenance: {},
    })!;
    const { draft } = mergeCarryForwardIntoNewTriage(emptyTriageCarryForwardDraft(), extraction, {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: "enc-prior",
      sourceEncounterDate: "2025-01-01T00:00:00.000Z",
      carriedForwardAt: NOW,
    });
    expect(draft.erV1.pastMedicalHistory).toBe("HTA");
  });

  it("never overwrites existing encounter values during profile hydration merge", () => {
    const extraction = profileToCarryForwardExtraction({
      ...emptyPatientClinicalHistoryProfile(NOW),
      allergies: { allergyNote: "Profile allergy" },
      provenance: {},
    })!;
    const target = emptyTriageCarryForwardDraft();
    target.allergyNote = "Already here";
    const { draft } = mergeCarryForwardIntoNewTriage(target, extraction, {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: "patient-profile",
      sourceEncounterDate: NOW,
      carriedForwardAt: NOW,
    });
    expect(draft.allergyNote).toBe("Already here");
  });

  it("saves provenance metadata on promotion", () => {
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: fullDraft(),
      carryForwardMeta: metaWithSectionStatus({ allergies: "reviewed" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      reviewerId: "rn-9",
      timestamp: NOW,
    });
    expect(result.profile?.provenance.allergies).toMatchObject({
      sourceEncounterId: ENCOUNTER_ID,
      sourceFacilityId: FACILITY_ID,
      reviewerId: "rn-9",
      lastReviewedAt: NOW,
    });
  });

  it("audit metadata excludes clinical text", () => {
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: fullDraft(),
      carryForwardMeta: metaWithSectionStatus({ allergies: "reviewed" }),
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    const audit = buildPatientHistoryReconciliationAuditMetadata({
      patientId: "patient-1",
      encounterId: ENCOUNTER_ID,
      result,
      reviewerId: "rn-1",
      timestamp: NOW,
    });
    expect(JSON.stringify(audit)).not.toContain("Pénicilline");
    expect(JSON.stringify(audit)).not.toContain("Metformine");
    expect(audit.changedSections).toContain("allergies");
  });

  it("encounter summary diff remains encounter-specific", () => {
    const profile: PatientClinicalHistoryProfile = {
      ...emptyPatientClinicalHistoryProfile(NOW),
      allergies: { allergyNote: "Profile" },
      provenance: {},
    };
    const draft = fullDraft();
    const diffs = compareEncounterDraftWithProfile(profile, draft);
    expect(diffs.find((d) => d.section === "allergies")?.kind).toBe("differs");
  });

  it("patient summary reflects longitudinal profile sections", () => {
    const profile: PatientClinicalHistoryProfile = {
      ...emptyPatientClinicalHistoryProfile(NOW),
      allergies: { allergyNote: "A" },
      medicalHistory: { pastMedicalHistory: "B" },
      provenance: {
        allergies: { sourceType: "reviewed_triage", lastReviewedAt: NOW, sourceEncounterDate: NOW },
        medicalHistory: { sourceType: "reviewed_triage", lastReviewedAt: NOW, sourceEncounterDate: NOW },
      },
    };
    expect(profileHasClinicalContent(profile)).toBe(true);
    const roundTrip = patientClinicalHistoryProfileFromJson(profile);
    expect(roundTrip?.allergies?.allergyNote).toBe("A");
    expect(profileToTriageDraft(profile).erV1.pastMedicalHistory).toBe("B");
  });

  it("backward compatibility with 19T.1 / 19T.2 carry-forward meta", () => {
    const legacyMeta: TriageCarryForwardMeta = {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: "enc-prior",
      sourceEncounterDate: "2025-12-01T00:00:00.000Z",
      carriedForwardAt: NOW,
      fields: { allergies: true },
      reviewStatus: "reviewed",
    };
    const result = reconcileEncounterHistoryIntoPatientProfile({
      currentProfile: null,
      encounterDraft: fullDraft(),
      carryForwardMeta: legacyMeta,
      encounterId: ENCOUNTER_ID,
      encounterDate: NOW,
      facilityId: FACILITY_ID,
      timestamp: NOW,
    });
    expect(result.sectionActions.allergies).toBe("promoted");
  });
});
