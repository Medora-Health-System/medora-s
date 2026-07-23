/**
 * D4A.2.8-HF2 — 20 scenarios reproducing production census/bed/bootstrap contradictions.
 */
import { describe, expect, it } from "vitest";
import {
  AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY_CERTIFICATION_ID,
  buildFacilityInvariantReport,
  buildHospitalCensusV1,
  evaluateHospitalCensusEligibility,
  reconcileBedAgainstCensus,
  resolveHospitalEncounterAuthority,
} from "../index.js";

const FAC = "90395a66-20d0-4165-aa76-e37ba3d520ed";
const OTHER_FAC = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const REQ = "8ad88df5-68e0-4fc8-9ca6-2eb116d32ced";

describe("MEDUI.AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY.D4A2_8_HF2", () => {
  it("certification id is stable", () => {
    expect(AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY_CERTIFICATION_ID).toBe(
      "MEDUI.AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY.D4A2_8_HF2"
    );
  });

  it("1: missing id → MISSING_ID", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: "",
      expectedFacilityId: FAC,
      foundById: null,
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.category).toBe("MISSING_ID");
  });

  it("2: globally missing encounter → NOT_FOUND", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: REQ,
      expectedFacilityId: FAC,
      foundById: null,
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.category).toBe("NOT_FOUND");
      expect(r.census.reasons).toContain("ENCOUNTER_NOT_FOUND");
    }
  });

  it("3: FACILITY_MISMATCH never collapsed to NOT_FOUND", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: REQ,
      expectedFacilityId: FAC,
      foundById: {
        id: REQ,
        facilityId: OTHER_FAC,
        patientId: "pat-1",
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      },
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.category).toBe("FACILITY_MISMATCH");
      expect(r.actualFacilityId).toBe(OTHER_FAC);
      expect(r.category).not.toBe("NOT_FOUND");
      expect(r.census.reasons).toContain("FACILITY_MISMATCH");
    }
  });

  it("4: ED source on hospital bed is census-ineligible with SOURCE_ED_ENCOUNTER", () => {
    const ed = {
      id: REQ,
      facilityId: FAC,
      patientId: "pat-1",
      type: "EMERGENCY",
      status: "OPEN",
      roomLabel: "MS-1",
      admissionSummaryJson: {},
    };
    const census = evaluateHospitalCensusEligibility({
      encounter: ed,
      expectedFacilityId: FAC,
    });
    expect(census.eligible).toBe(false);
    expect(census.reasons).toContain("SOURCE_ED_ENCOUNTER");
    expect(census.reasons).toContain("TYPE_NOT_HOSPITAL");
    const bed = reconcileBedAgainstCensus({
      bedKeyRaw: "MS:1",
      occupant: ed,
      expectedFacilityId: FAC,
    });
    expect(bed.warnings).toContain("BED_WITHOUT_ACTIVE_HOSPITAL_ENCOUNTER");
    expect(bed.warnings).toContain("SOURCE_ED_ENCOUNTER");
  });

  it("5: ED on MS-1 + missing destination → census 0, bed occupied warning", () => {
    const census = buildHospitalCensusV1({
      facilityId: FAC,
      placementAvailability: "FEATURE_DISABLED",
      encounters: [
        {
          id: REQ,
          facilityId: FAC,
          type: "EMERGENCY",
          status: "OPEN",
          roomLabel: "MS-1",
        },
      ],
      occupiedBedKeysWithoutEncounter: ["MS:1"],
    });
    expect(census.summary.activeObservation).toBe(0);
    expect(census.summary.activeInpatient).toBe(0);
    expect(
      census.diagnostics.some((d) => d.code === "OCCUPIED_BED_WITHOUT_ACTIVE_ENCOUNTER")
    ).toBe(true);
  });

  it("6: ED source + destination IP same patient/facility → unambiguous redirect", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: "ed-1",
      expectedFacilityId: FAC,
      foundById: {
        id: "ed-1",
        facilityId: FAC,
        patientId: "pat-1",
        type: "EMERGENCY",
        status: "OPEN",
        roomLabel: "MS-1",
      },
      lineageDestination: {
        id: "ip-1",
        facilityId: FAC,
        patientId: "pat-1",
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: {
          requestedEncounterType: "INPATIENT",
          originatingEdEncounterId: "ed-1",
        },
        roomLabel: "MS-1",
      },
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.redirected).toBe(true);
      expect(r.resolvedEncounterId).toBe("ip-1");
      expect(r.census.eligible).toBe(true);
    }
  });

  it("7: cross-patient lineage destination rejected", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: "ed-1",
      expectedFacilityId: FAC,
      foundById: {
        id: "ed-1",
        facilityId: FAC,
        patientId: "pat-1",
        type: "EMERGENCY",
        status: "OPEN",
      },
      lineageDestination: {
        id: "ip-1",
        facilityId: FAC,
        patientId: "pat-OTHER",
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      },
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.category).toBe("CROSS_PATIENT_LINEAGE");
  });

  it("8: cross-facility lineage destination rejected", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: "ed-1",
      expectedFacilityId: FAC,
      foundById: {
        id: "ed-1",
        facilityId: FAC,
        patientId: "pat-1",
        type: "EMERGENCY",
        status: "OPEN",
      },
      lineageDestination: {
        id: "ip-1",
        facilityId: OTHER_FAC,
        patientId: "pat-1",
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      },
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.category).toBe("CROSS_FACILITY_LINEAGE");
  });

  it("9: ED rejected on inpatient workspace without destination", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: "ed-1",
      expectedFacilityId: FAC,
      foundById: {
        id: "ed-1",
        facilityId: FAC,
        patientId: "pat-1",
        type: "EMERGENCY",
        status: "OPEN",
      },
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.category).toBe("ED_ENCOUNTER_REJECTED");
  });

  it("10: Observation clinical lane rejected on inpatient workspace", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: "obs-1",
      expectedFacilityId: FAC,
      foundById: {
        id: "obs-1",
        facilityId: FAC,
        patientId: "pat-1",
        type: "INPATIENT",
        status: "OPEN",
        billingClassification: "OBSERVATION",
        admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
      },
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.category).toBe("OBSERVATION_ENCOUNTER_REJECTED");
  });

  it("11: Observation workspace accepts OBS lane", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: "obs-1",
      expectedFacilityId: FAC,
      foundById: {
        id: "obs-1",
        facilityId: FAC,
        patientId: "pat-1",
        type: "INPATIENT",
        status: "OPEN",
        billingClassification: "OBSERVATION",
        admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
        roomLabel: "OBS-1",
      },
      workspace: "OBSERVATION",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clinicalContext).toBe("OBSERVATION");
      expect(r.census.eligible).toBe(true);
    }
  });

  it("12: bare INPATIENT type remains census-eligible (HF1 no regression)", () => {
    const census = evaluateHospitalCensusEligibility({
      encounter: {
        id: "ip-direct",
        facilityId: FAC,
        patientId: "pat-1",
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: {},
        roomLabel: "MS-2",
      },
      expectedFacilityId: FAC,
    });
    expect(census.eligible).toBe(true);
    expect(census.clinicalContext).toBe("INPATIENT");
  });

  it("13: CLOSED encounter excluded from census", () => {
    const census = evaluateHospitalCensusEligibility({
      encounter: {
        id: "ip-closed",
        facilityId: FAC,
        patientId: "pat-1",
        type: "INPATIENT",
        status: "CLOSED",
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      },
      expectedFacilityId: FAC,
    });
    expect(census.eligible).toBe(false);
    expect(census.reasons).toContain("CLOSED_ENCOUNTER");
  });

  it("14: cancelled/voided lifecycle excluded", () => {
    const census = evaluateHospitalCensusEligibility({
      encounter: {
        id: "ip-void",
        facilityId: FAC,
        patientId: "pat-1",
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: {
          requestedEncounterType: "INPATIENT",
          inpatientLifecycle: { voidedAt: "2026-07-01T00:00:00Z" },
        },
      },
      expectedFacilityId: FAC,
    });
    expect(census.eligible).toBe(false);
    expect(census.reasons).toContain("CANCELLED_OR_VOIDED");
  });

  it("15: destination IP on MS-1 restores census + clears bed warning", () => {
    const census = buildHospitalCensusV1({
      facilityId: FAC,
      placementAvailability: "FEATURE_DISABLED",
      encounters: [
        {
          id: "ip-1",
          facilityId: FAC,
          type: "INPATIENT",
          status: "OPEN",
          admissionSummaryJson: {
            requestedEncounterType: "INPATIENT",
            originatingEdEncounterId: "ed-1",
          },
          roomLabel: "MS-1",
        },
      ],
      occupiedBedKeysWithoutEncounter: [],
      bedSummary: { total: 30, available: 29, occupied: 1, cleaning: 0, blocked: 0 },
    });
    expect(census.summary.activeInpatient).toBe(1);
    expect(census.summary.bedsOccupied).toBe(1);
    expect(census.diagnostics).toHaveLength(0);
  });

  it("16: facility invariant detects ED occupants on hospital beds", () => {
    const report = buildFacilityInvariantReport({
      facilityId: FAC,
      encounters: [
        {
          id: "ed-1",
          facilityId: FAC,
          patientId: "pat-1",
          type: "EMERGENCY",
          status: "OPEN",
          roomLabel: "MS-1",
        },
      ],
      occupiedBedOccupantIds: ["ed-1"],
    });
    expect(report.openHospitalCensusEligible).toBe(0);
    expect(report.occupiedBedsFromBoard).toBe(1);
    expect(report.occupiedBedsWithoutCensusEncounter).toBe(1);
    expect(report.edOccupantsOnHospitalBeds).toBe(1);
  });

  it("17: observation + inpatient census lanes mutually exclusive per encounter", () => {
    const census = buildHospitalCensusV1({
      facilityId: FAC,
      placementAvailability: "FEATURE_DISABLED",
      encounters: [
        {
          id: "obs-1",
          facilityId: FAC,
          type: "INPATIENT",
          status: "OPEN",
          billingClassification: "OBSERVATION",
          admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
          roomLabel: "OBS-1",
        },
        {
          id: "ip-1",
          facilityId: FAC,
          type: "INPATIENT",
          status: "OPEN",
          admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
          roomLabel: "MS-1",
        },
      ],
    });
    expect(census.summary.activeObservation).toBe(1);
    expect(census.summary.activeInpatient).toBe(1);
    expect(census.summary.activeHospitalPatients).toBe(2);
  });

  it("18: never silently substitute unrelated open IP for requested ED", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: "ed-1",
      expectedFacilityId: FAC,
      foundById: {
        id: "ed-1",
        facilityId: FAC,
        patientId: "pat-1",
        type: "EMERGENCY",
        status: "OPEN",
      },
      // No lineageDestination provided → must not invent unrelated IP
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.category).toBe("ED_ENCOUNTER_REJECTED");
  });

  it("19: hospitalEpisodeFoundationEnabled=false path — eligibility ignores missing episode id", () => {
    const census = evaluateHospitalCensusEligibility({
      encounter: {
        id: "ip-1",
        facilityId: FAC,
        patientId: "pat-1",
        type: "INPATIENT",
        status: "OPEN",
        hospitalEpisodeId: null,
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      },
      expectedFacilityId: FAC,
    });
    expect(census.eligible).toBe(true);
  });

  it("20: OUTPATIENT type excluded TYPE_NOT_HOSPITAL", () => {
    const census = evaluateHospitalCensusEligibility({
      encounter: {
        id: "op-1",
        facilityId: FAC,
        patientId: "pat-1",
        type: "OUTPATIENT",
        status: "OPEN",
      },
      expectedFacilityId: FAC,
    });
    expect(census.eligible).toBe(false);
    expect(census.reasons).toContain("TYPE_NOT_HOSPITAL");
  });
});
