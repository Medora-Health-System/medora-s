/**
 * ED.HOSP.1C — destination-intent precedence and type-flip identifiability.
 * Documents authority in tests (not permanent UI prose).
 */

import { describe, expect, it } from "vitest";
import { encounterTypeSchema } from "../schemas/patient.js";
import { billingClassificationForPlacementDestination } from "./admissionDestinationGuardV1.js";
import { resolveClinicalEncounterContext } from "./clinicalEncounterIdentity.js";
import { mergeAdmissionSummaryFieldsPreservingNested } from "./admissionSummaryMerge.js";
import { resolveHospitalEpisodeInternalPlacementKind } from "./hospitalEpisodeEligibility.js";
import {
  hospitalDestinationIntentForPlacementCreate,
  isInternalPlacementDestinationLocked,
  isObservationHospitalDestinationIntent,
  isObservationOperationalStay,
  projectBillingClassificationForHospitalDestination,
  resolveHospitalDestinationIntent,
  signedHospitalBoundEdDecisionSignerUserId,
  signedHospitalBoundEdDisposition,
  signedHospitalBoundEdPlacementReconcileCandidate,
} from "./hospitalDestinationIntent.js";
import {
  assertLocalHospitalDestinationAllowed,
  localInpatientPlacementBlockedByFacilityType,
} from "./facilityDeploymentProfilesV1.js";

describe("ED.HOSP.1C hospital destination intent", () => {
  it("1. explicit OBSERVATION beats observation-compatible legacy ambiguity", () => {
    expect(
      resolveHospitalDestinationIntent({
        requestedEncounterType: "OBSERVATION",
        careLevel: "MEDICAL_SURGICAL",
      })
    ).toBe("OBSERVATION");
  });

  it("2. explicit INPATIENT beats observation-like legacy LOC", () => {
    expect(
      resolveHospitalDestinationIntent({
        requestedEncounterType: "INPATIENT",
        careLevel: "OBSERVATION",
      })
    ).toBe("INPATIENT");
    expect(
      isObservationHospitalDestinationIntent({
        requestedEncounterType: "INPATIENT",
        careLevel: "OBSERVATION",
      })
    ).toBe(false);
  });

  it("3. missing explicit type falls back to legacy Observation LOC", () => {
    expect(resolveHospitalDestinationIntent({ careLevel: "OBSERVATION" })).toBe("OBSERVATION");
    expect(
      resolveHospitalDestinationIntent({
        admissionSummaryJson: { careLevel: "Observation", admissionPacketV1: { levelOfCareCode: "OBS" } },
      })
    ).toBe("OBSERVATION");
  });

  it("4. missing explicit type + inpatient LOC resolves INPATIENT", () => {
    expect(resolveHospitalDestinationIntent({ careLevel: "MEDICAL_SURGICAL" })).toBe("INPATIENT");
  });

  it("billing does not override explicit clinical destination", () => {
    expect(
      projectBillingClassificationForHospitalDestination({
        requestedEncounterType: "OBSERVATION",
        billingClassification: "INPATIENT",
      })
    ).toBe("OBSERVATION");
    expect(
      projectBillingClassificationForHospitalDestination({
        requestedEncounterType: "INPATIENT",
        billingClassification: "OBSERVATION",
      })
    ).toBe("INPATIENT");
  });

  it("placement dest is used only when summary dest is absent", () => {
    expect(
      resolveHospitalDestinationIntent({
        placementRequestedEncounterType: "INPATIENT",
        admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
      })
    ).toBe("OBSERVATION");
    expect(
      resolveHospitalDestinationIntent({
        placementRequestedEncounterType: "OBSERVATION",
        admissionSummaryJson: { careLevel: "MEDICAL_SURGICAL" },
      })
    ).toBe("OBSERVATION");
  });

  it("15. EncounterType has no OBSERVATION value", () => {
    expect(encounterTypeSchema.options).toEqual(["OUTPATIENT", "INPATIENT", "EMERGENCY", "URGENT_CARE"]);
    expect(encounterTypeSchema.options).not.toContain("OBSERVATION");
  });

  it("placement create defaults unknown dest to INPATIENT", () => {
    expect(hospitalDestinationIntentForPlacementCreate({})).toBe("INPATIENT");
  });

  it("committed placement dest is locked after DRAFT/SIGNED", () => {
    expect(isInternalPlacementDestinationLocked(null)).toBe(false);
    expect(isInternalPlacementDestinationLocked("DRAFT")).toBe(false);
    expect(isInternalPlacementDestinationLocked("SIGNED")).toBe(false);
    expect(isInternalPlacementDestinationLocked("REQUESTED")).toBe(true);
    expect(isInternalPlacementDestinationLocked("ARRIVED_DESTINATION")).toBe(true);
  });
});

describe("ED.HOSP.1C legacy type-flip identifiability", () => {
  it("17. Observation remains identifiable after EMERGENCY→INPATIENT", () => {
    expect(
      resolveClinicalEncounterContext({
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { requestedEncounterType: "OBSERVATION", careLevel: "OBSERVATION" },
        billingClassification: "EMERGENCY_DEPARTMENT",
      })
    ).toBe("OBSERVATION");
  });

  it("18. Admission remains identifiable after EMERGENCY→INPATIENT", () => {
    expect(
      resolveClinicalEncounterContext({
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { requestedEncounterType: "INPATIENT", careLevel: "MEDICAL_SURGICAL" },
      })
    ).toBe("INPATIENT");
  });

  it("19. Encounter.type INPATIENT alone does not override explicit OBS intent", () => {
    expect(
      resolveClinicalEncounterContext({
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
        billingClassification: "INPATIENT",
      })
    ).toBe("OBSERVATION");
  });

  it("legacy Observation LOC remains identifiable when dest stamp is missing", () => {
    expect(
      resolveClinicalEncounterContext({
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { careLevel: "OBSERVATION" },
        billingClassification: "EMERGENCY_DEPARTMENT",
      })
    ).toBe("OBSERVATION");
  });

  it("20-21. dest-projected billing survives type INPATIENT", () => {
    expect(
      projectBillingClassificationForHospitalDestination({
        admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
        billingClassification: "EMERGENCY_DEPARTMENT",
      })
    ).toBe("OBSERVATION");
    expect(
      projectBillingClassificationForHospitalDestination({
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      })
    ).toBe("INPATIENT");
  });

  it("bare INPATIENT type without dest/careLevel is not Observation", () => {
    expect(
      resolveClinicalEncounterContext({
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { admissionReason: "Chest pain" },
      })
    ).toBe("INPATIENT");
  });
});

describe("ED.HOSP.1C receiving / observationOps / episode projection", () => {
  it("23-26. receiving dest maps type INPATIENT + dest billing", () => {
    expect(billingClassificationForPlacementDestination("OBSERVATION")).toBe("OBSERVATION");
    expect(billingClassificationForPlacementDestination("INPATIENT")).toBe("INPATIENT");
  });

  it("30. observationOps recognizes receiving OBS chart despite EncounterType.INPATIENT", () => {
    expect(
      isObservationOperationalStay({
        encounterType: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
      })
    ).toBe(true);
  });

  it("31. observationOps does not classify ordinary inpatient as OBS", () => {
    expect(
      isObservationOperationalStay({
        encounterType: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      })
    ).toBe(false);
  });

  it("HospitalEpisode kind follows dest then legacy LOC", () => {
    expect(
      resolveHospitalEpisodeInternalPlacementKind({ requestedEncounterType: "OBSERVATION", careLevel: "MEDICAL_SURGICAL" })
    ).toBe("OBSERVATION");
    expect(
      resolveHospitalEpisodeInternalPlacementKind({ requestedEncounterType: "INPATIENT", careLevel: "OBSERVATION" })
    ).toBe("INPATIENT_ADMISSION");
    expect(resolveHospitalEpisodeInternalPlacementKind({ careLevel: "OBSERVATION" })).toBe("OBSERVATION");
    expect(resolveHospitalEpisodeInternalPlacementKind({})).toBe("INTERNAL_UNSPECIFIED");
  });
});

describe("ED.HOSP.1C merge preserves dest (no new JSON SOT)", () => {
  it("nursing/flat merge does not erase requestedEncounterType", () => {
    const merged = mergeAdmissionSummaryFieldsPreservingNested(
      {
        requestedEncounterType: "OBSERVATION",
        admissionCorrelation: { admissionCorrelationId: "corr-1" },
        careLevel: "OBSERVATION",
      },
      {
        admissionReason: "Updated reason",
        serviceUnit: "HOSPITAL_MEDICINE",
        admissionDiagnosis: "ACS",
        careLevel: "OBSERVATION",
        conditionAtAdmission: "Stable",
        initialPlan: "Troponin",
        responsiblePhysicianName: "Dr A",
      }
    );
    expect(merged.requestedEncounterType).toBe("OBSERVATION");
    expect(merged.admissionCorrelation).toEqual({ admissionCorrelationId: "corr-1" });
    expect(Object.keys(merged)).not.toContain("edHosp1c");
  });

  it("flat merge preserves INPATIENT dest when careLevel is rewritten", () => {
    const merged = mergeAdmissionSummaryFieldsPreservingNested(
      { requestedEncounterType: "INPATIENT", careLevel: "MEDICAL_SURGICAL" },
      {
        admissionReason: "Admit",
        serviceUnit: "MS",
        admissionDiagnosis: "PNA",
        careLevel: "TELEMETRY",
        conditionAtAdmission: "",
        initialPlan: "",
        responsiblePhysicianName: "",
      }
    );
    expect(merged.requestedEncounterType).toBe("INPATIENT");
  });
});

describe("signed hospital-bound ED disposition (placement reconcile)", () => {
  it("accepts SIGN + explicit OBSERVATION", () => {
    expect(
      signedHospitalBoundEdDisposition({
        admissionDecisionMode: "SIGN",
        requestedEncounterType: "OBSERVATION",
        admissionDecisionByUserId: "prov-1",
      })
    ).toBe("OBSERVATION");
    expect(
      signedHospitalBoundEdDecisionSignerUserId({
        admissionDecisionMode: "SIGN",
        requestedEncounterType: "OBSERVATION",
        admissionDecisionByUserId: "prov-1",
      })
    ).toBe("prov-1");
  });

  it("accepts SIGN + explicit INPATIENT", () => {
    expect(
      signedHospitalBoundEdDisposition({
        admissionDecisionMode: "SIGN",
        requestedEncounterType: "INPATIENT",
      })
    ).toBe("INPATIENT");
  });

  it("excludes Home, AMA, Transfer, LWBS, Elopement, Deceased, and unsigned drafts", () => {
    for (const dest of ["HOME", "TRANSFER", "AMA", "LWBS", "ELOPEMENT", "DECEASED", "OTHER"]) {
      expect(
        signedHospitalBoundEdDisposition({
          admissionDecisionMode: "SIGN",
          requestedEncounterType: dest,
        })
      ).toBeNull();
    }
    expect(
      signedHospitalBoundEdDisposition({
        admissionDecisionMode: "DRAFT",
        requestedEncounterType: "OBSERVATION",
      })
    ).toBeNull();
  });

  it("requires signer and decision timestamp for reconcile eligibility", () => {
    expect(
      signedHospitalBoundEdPlacementReconcileCandidate({
        admissionDecisionMode: "SIGN",
        requestedEncounterType: "OBSERVATION",
        admissionDecisionByUserId: "prov-1",
      })
    ).toBeNull();
    expect(
      signedHospitalBoundEdPlacementReconcileCandidate({
        admissionDecisionMode: "SIGN",
        requestedEncounterType: "OBSERVATION",
        admissionDecisionAt: "2026-09-01T21:15:45.841Z",
      })
    ).toBeNull();
    expect(
      signedHospitalBoundEdPlacementReconcileCandidate({
        admissionDecisionMode: "SIGN",
        requestedEncounterType: "OBSERVATION",
        admissionDecisionByUserId: "prov-1",
        admissionDecisionAt: "2026-09-01T21:15:45.841Z",
      })
    ).toEqual({
      requestedEncounterType: "OBSERVATION",
      signerUserId: "prov-1",
      decisionAt: new Date("2026-09-01T21:15:45.841Z"),
    });
  });

  it("does not invent INPATIENT from careLevel when dest token is missing", () => {
    expect(
      signedHospitalBoundEdDisposition({
        admissionDecisionMode: "SIGN",
        careLevel: "MEDICAL_SURGICAL",
      })
    ).toBeNull();
  });
});

describe("ED.HOSP.1C facility capability", () => {
  it("34. hospital facility can request INPATIENT", () => {
    expect(
      assertLocalHospitalDestinationAllowed({ facilityType: "HOSPITAL", destination: "INPATIENT" }).ok
    ).toBe(true);
  });

  it("35. FSER without inpatient capability cannot request local INPATIENT", () => {
    expect(localInpatientPlacementBlockedByFacilityType("FREESTANDING_ER")).toBe(true);
    expect(
      assertLocalHospitalDestinationAllowed({
        facilityType: "FREESTANDING_ER",
        destination: "INPATIENT",
      })
    ).toEqual({ ok: false, code: "INPATIENT_DISABLED_BY_PROFILE" });
  });

  it("36. same FSER can request OBSERVATION", () => {
    expect(
      assertLocalHospitalDestinationAllowed({
        facilityType: "FREESTANDING_ER",
        destination: "OBSERVATION",
      }).ok
    ).toBe(true);
  });

  it("unknown facility type does not silently block INPATIENT (no CLINIC default trap)", () => {
    expect(localInpatientPlacementBlockedByFacilityType(null)).toBe(false);
    expect(localInpatientPlacementBlockedByFacilityType("CLINIC")).toBe(false);
    expect(
      assertLocalHospitalDestinationAllowed({ facilityType: "CLINIC", destination: "INPATIENT" }).ok
    ).toBe(true);
  });
});
