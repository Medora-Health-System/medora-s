import { describe, expect, it } from "vitest";
import {
  ADMISSION_WORKFLOW_VISIBILITY_D4A22_CERTIFICATION,
  INPATIENT_CREATION_GATE_D4A22,
  PLACEMENT_READINESS_AUDIT_D4A22,
  applyAdmissionWorkflowSimulation,
  buildAdmissionPackagePreview,
  buildAdmissionWorkflowTimeline,
  buildAdmissionWorkflowVisibilityModel,
  isAdmissionSimulationAllowed,
  resolveAdmissionWorkflowStatus,
} from "./admissionWorkflowVisibilityD4a22.js";
import { InternalPlacementStatus } from "./internalPlacementStatusMachine.js";

const signedSummary = {
  admissionDecisionMode: "SIGN",
  admissionDecisionAt: "2026-07-22T12:00:00.000Z",
  admissionDecisionByUserId: "user-1",
  admissionReason: "Appendicitis requiring surgery",
  admissionDiagnosis: "K35.80",
  admissionDiagnosesV1: {
    primaryDisplay: "K35.80 — Appendicitis",
    secondaryDisplays: ["E11.9"],
  },
  responsiblePhysicianName: "Dr Test",
  admissionPacketV1: {
    version: 1,
    admittingServiceCode: "GENERAL_SURGERY",
    levelOfCareCode: "MED_SURG",
    conditionStatus: "STABLE",
    fields: {
      admissionReason: {
        value: "Appendicitis requiring surgery",
        origin: "PHYSICIAN_EDITED",
        sources: [],
      },
      initialPlan: { value: "NPO, fluids, surgery", origin: "PHYSICIAN_EDITED", sources: [] },
      conditionAtAdmission: { value: "Stable", origin: "SYSTEM_PROPOSAL", sources: [] },
    },
    structuredInitialPlan: {
      items: [
        {
          id: "1",
          display: "NPO",
          category: "DIET",
          sourceType: "PROVIDER_PLAN",
          status: "PLANNED",
          selectedForNarrative: true,
        },
      ],
    },
  },
};

describe("MEDUI.ADMISSION_WORKFLOW_VISIBILITY.D4A2_2", () => {
  it("exposes certification constant", () => {
    expect(ADMISSION_WORKFLOW_VISIBILITY_D4A22_CERTIFICATION).toBe(
      "MEDUI.ADMISSION_WORKFLOW_VISIBILITY.D4A2_2"
    );
  });

  it("status A: signed decision with placement OFF → DECISION_SIGNED_NO_PLACEMENT", () => {
    const status = resolveAdmissionWorkflowStatus({
      admissionSummaryJson: signedSummary,
      placementWorkflowEnabled: false,
      placementStatus: null,
    });
    expect(status).toBe("DECISION_SIGNED_NO_PLACEMENT");
    const model = buildAdmissionWorkflowVisibilityModel({
      admissionSummaryJson: signedSummary,
      placementWorkflowEnabled: false,
    });
    expect(model.inpatientEncounterExists).toBe(false);
    expect(model.falselyImpliesPlacementSubmitted).toBe(false);
    expect(model.timeline.find((n) => n.id === "PHYSICIAN_DECISION")?.state).toBe("COMPLETED");
    expect(model.timeline.find((n) => n.id === "PLACEMENT_REQUEST")?.state).toBe("PENDING");
    expect(model.timeline.find((n) => n.id === "INPATIENT_ENCOUNTER")?.state).toBe("NOT_CREATED");
  });

  it("status B/C/D transitions from placement status", () => {
    expect(
      resolveAdmissionWorkflowStatus({
        admissionSummaryJson: signedSummary,
        placementStatus: InternalPlacementStatus.REQUESTED,
        placementWorkflowEnabled: true,
      })
    ).toBe("PLACEMENT_REQUESTED_WAITING_BED");

    expect(
      resolveAdmissionWorkflowStatus({
        admissionSummaryJson: signedSummary,
        placementStatus: InternalPlacementStatus.BED_ASSIGNED,
        placementWorkflowEnabled: true,
      })
    ).toBe("BED_ASSIGNED_WAITING_RECEIVING");

    expect(
      resolveAdmissionWorkflowStatus({
        admissionSummaryJson: signedSummary,
        placementStatus: InternalPlacementStatus.ARRIVED_DESTINATION,
        receivingEncounterId: "ip-1",
        placementWorkflowEnabled: true,
      })
    ).toBe("ARRIVED_INPATIENT_CREATED");
  });

  it("timeline reflects waiting/completed nodes", () => {
    const timeline = buildAdmissionWorkflowTimeline({
      admissionSummaryJson: signedSummary,
      placementWorkflowEnabled: true,
      placementStatus: InternalPlacementStatus.BED_ASSIGNED,
      placementRequestedAt: "2026-07-22T12:01:00.000Z",
      placementAssignedAt: "2026-07-22T12:10:00.000Z",
    });
    expect(timeline.find((n) => n.id === "PLACEMENT_REQUEST")?.state).toBe("COMPLETED");
    expect(timeline.find((n) => n.id === "BED_ASSIGNMENT")?.state).toBe("COMPLETED");
    expect(timeline.find((n) => n.id === "RECEIVING_ACCEPTANCE")?.state).toBe("WAITING");
    expect(timeline.find((n) => n.id === "PATIENT_TRANSPORT")?.state).toBe("PENDING");
    expect(timeline.find((n) => n.id === "INPATIENT_ENCOUNTER")?.state).toBe("NOT_CREATED");
  });

  it("simulation overlays stages without inventing receiving encounter id", () => {
    const base = {
      admissionSummaryJson: signedSummary,
      placementWorkflowEnabled: false,
      receivingEncounterId: null as string | null,
    };
    const arrived = applyAdmissionWorkflowSimulation(base, "PATIENT_ARRIVED");
    expect(arrived.placementStatus).toBe(InternalPlacementStatus.ARRIVED_DESTINATION);
    expect(arrived.receivingEncounterId).toBeNull();

    const model = buildAdmissionWorkflowVisibilityModel({
      ...base,
      simulationStage: "PATIENT_ARRIVED",
    });
    expect(model.simulationActive).toBe(true);
    expect(model.inpatientEncounterExists).toBe(false);
    expect(model.statusCode).toBe("ARRIVED_INPATIENT_CREATED");
    expect(model.timeline.find((n) => n.id === "INPATIENT_ENCOUNTER")?.state).toBe("COMPLETED");
  });

  it("simulation is blocked in production", () => {
    expect(isAdmissionSimulationAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(isAdmissionSimulationAllowed({ NODE_ENV: "development" })).toBe(true);
  });

  it("package preview loads signed packet fields", () => {
    const preview = buildAdmissionPackagePreview({ admissionSummaryJson: signedSummary });
    expect(preview.signed).toBe(true);
    expect(preview.reasonForAdmission).toContain("Appendicitis");
    expect(preview.primaryDiagnosis).toContain("K35.80");
    expect(preview.structuredPlanItems.length).toBeGreaterThan(0);
    expect(preview.service).toBe("GENERAL_SURGERY");
  });

  it("documents inpatient creation gate is not on physician SIGN", () => {
    expect(INPATIENT_CREATION_GATE_D4A22.notOnPhysicianSign).toBe(true);
    expect(INPATIENT_CREATION_GATE_D4A22.triggerStatus).toBe("ARRIVED_DESTINATION");
    expect(INPATIENT_CREATION_GATE_D4A22.method).toBe("transition");
    expect(INPATIENT_CREATION_GATE_D4A22.createCallsite).toBe("tx.encounter.create");
    expect(PLACEMENT_READINESS_AUDIT_D4A22.every((s) => typeof s.safeToActivate === "boolean")).toBe(
      true
    );
    expect(
      PLACEMENT_READINESS_AUDIT_D4A22.find((s) => s.step === "INTERNAL_PLACEMENT_REQUEST")
        ?.safeToActivate
    ).toBe(false);
  });
});
