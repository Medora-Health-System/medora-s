import { describe, expect, it } from "vitest";
import {
  evaluateInternalPlacementD3cBenchmark,
  buildInternalPlacementD3cBenchmarkCases,
} from "./internalPlacementD3cBenchmark.js";
import {
  internalPlacementWorkflowEnabled,
  receivingEncounterFoundationEnabled,
  INTERNAL_PLACEMENT_WORKFLOW_FLAG,
  RECEIVING_ENCOUNTER_FOUNDATION_FLAG,
} from "./internalPlacementFeatureFlags.js";
import { validateInternalPlacementClinicalRequestForSign } from "./internalPlacementClinicalRequest.js";
import {
  classifyLegacyAdmissionCompatibility,
  projectInternalPlacementState,
} from "./internalPlacementProjection.js";
import {
  InternalPlacementActorRole,
  InternalPlacementStatus,
  placementArrivedFromHandoffAlone,
  placementBedAssignedFromRoomLabelAlone,
  validateInternalPlacementTransition,
} from "./internalPlacementStatusMachine.js";

describe("internalPlacement feature flags", () => {
  it("defaults OFF", () => {
    expect(internalPlacementWorkflowEnabled()).toBe(false);
    expect(receivingEncounterFoundationEnabled()).toBe(false);
    expect(INTERNAL_PLACEMENT_WORKFLOW_FLAG).toBe("internalPlacementWorkflowEnabled");
    expect(RECEIVING_ENCOUNTER_FOUNDATION_FLAG).toBe("receivingEncounterFoundationEnabled");
  });

  it("enables when env truthy", () => {
    expect(
      internalPlacementWorkflowEnabled({ INTERNAL_PLACEMENT_WORKFLOW_ENABLED: "true" })
    ).toBe(true);
    expect(
      receivingEncounterFoundationEnabled({ RECEIVING_ENCOUNTER_FOUNDATION_ENABLED: "1" })
    ).toBe(true);
  });
});

describe("internalPlacement status machine", () => {
  it("allows provider submit DRAFT→REQUESTED", () => {
    expect(
      validateInternalPlacementTransition(
        InternalPlacementStatus.DRAFT,
        InternalPlacementStatus.REQUESTED,
        InternalPlacementActorRole.PROVIDER
      ).ok
    ).toBe(true);
  });

  it("blocks arrival before departure", () => {
    expect(
      validateInternalPlacementTransition(
        InternalPlacementStatus.READY_FOR_TRANSFER,
        InternalPlacementStatus.ARRIVED_DESTINATION,
        InternalPlacementActorRole.RECEIVING_NURSE
      ).ok
    ).toBe(false);
  });

  it("never treats roomLabel/handoff as bed/arrival", () => {
    expect(placementBedAssignedFromRoomLabelAlone()).toBe(false);
    expect(placementArrivedFromHandoffAlone()).toBe(false);
  });
});

describe("internalPlacement clinical request", () => {
  it("requires explicit OBSERVATION or INPATIENT", () => {
    expect(
      validateInternalPlacementClinicalRequestForSign({
        requestedLevelOfCare: "OBS",
        requestedService: "Med",
        admissionDiagnosisSummary: "x",
        reasonForPlacement: "y",
        clinicalPriority: "ROUTINE",
      }).ok
    ).toBe(false);
    expect(
      validateInternalPlacementClinicalRequestForSign({
        requestedEncounterType: "OBSERVATION",
        requestedLevelOfCare: "OBS",
        requestedService: "Med",
        admissionDiagnosisSummary: "x",
        reasonForPlacement: "y",
        clinicalPriority: "ROUTINE",
      }).ok
    ).toBe(true);
  });
});

describe("legacy compatibility classifier", () => {
  it("does not rewrite — classifies type-promoted records", () => {
    expect(
      classifyLegacyAdmissionCompatibility({
        encounterType: "INPATIENT",
        admissionSummaryJson: { careLevel: "Acute" },
      })
    ).toBe("LEGACY_TYPE_PROMOTION");
  });
});

describe("projection", () => {
  it("projects null safely", () => {
    expect(projectInternalPlacementState(null)).toBeNull();
  });
});

describe("D3C benchmark", () => {
  it("has at least 100 cases with exact-set 1.00 on measured signals", () => {
    const cases = buildInternalPlacementD3cBenchmarkCases();
    expect(cases.length).toBeGreaterThanOrEqual(100);
    const report = evaluateInternalPlacementD3cBenchmark(cases);
    expect(report.exactSet).toBe(1);
    expect(report.precision).toBe(1);
    expect(report.recall).toBe(1);
    expect(report.advisory).toBe(true);
  });
});
