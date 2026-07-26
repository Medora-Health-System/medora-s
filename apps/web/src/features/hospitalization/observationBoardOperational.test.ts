import { describe, expect, it } from "vitest";
import {
  emptyHospitalAssignmentBag,
  type EnterpriseHospitalAssignmentBagV1,
} from "@medora/shared";
import {
  compareObservationBoardRows,
  computeObservationBoardCensus,
  computeObservationBoardStaffingPressure,
  observationBoardRowMatchesOperationalFilter,
  observationRowOperationalAttentionScore,
  type ObservationBoardRowInput,
} from "./observationBoardOperational";

function slot(userId: string) {
  return {
    userId,
    assignedAt: "2026-07-01T00:00:00.000Z",
    source: "SELF_ASSIGN" as const,
    displayName: null,
  };
}

function summaryBag(input: {
  careSetting?: "OBSERVATION" | "INPATIENT";
  providerId?: string | null;
  nurseId?: string | null;
}): unknown {
  const bag: EnterpriseHospitalAssignmentBagV1 = emptyHospitalAssignmentBag(
    input.careSetting ?? "OBSERVATION"
  );
  if (input.providerId) {
    bag.workflow.PRIMARY_PROVIDER = slot(input.providerId);
    bag.slots.PROVIDER = bag.workflow.PRIMARY_PROVIDER;
  }
  if (input.nurseId) {
    bag.workflow.PRIMARY_RN = slot(input.nurseId);
    bag.slots.NURSE = bag.workflow.PRIMARY_RN;
  }
  return { enterpriseHospitalAssignmentV1: bag };
}

const baseRow = (over: Partial<ObservationBoardRowInput>): ObservationBoardRowInput => ({
  id: "e1",
  status: "OPEN",
  type: "INPATIENT",
  billingClassification: "OBSERVATION",
  createdAt: "2026-01-01T12:00:00.000Z",
  physicianAssignedUserId: "md1",
  nurseAssignedUserId: "rn1",
  trackboardOps: { resultsPendingCount: 0, criticalResultUnacknowledged: false },
  patient: { firstName: "A", lastName: "One" },
  triage: { esi: 3 },
  ...over,
});

describe("computeObservationBoardCensus", () => {
  it("returns zeros for empty list", () => {
    expect(computeObservationBoardCensus([])).toMatchObject({
      activeObservationPatients: 0,
      rnUnassignedCount: 0,
      providerUnassignedCount: 0,
    });
  });

  it("counts assignment gaps from ownership (bag), not ED columns alone", () => {
    const rows: ObservationBoardRowInput[] = [
      baseRow({
        id: "a",
        admissionSummaryJson: summaryBag({ providerId: "obs-md", nurseId: null }),
        physicianAssignedUserId: "ed-md",
        nurseAssignedUserId: "ed-rn",
        observationOps: {
          anchorKind: "createdAt",
          anchorIso: new Date().toISOString(),
          losMs: 1000,
          losLabel: "0h01",
          losLabelCompact: "0h01",
          overnightUtcSpan: false,
          extendedStay24h: false,
          flags: {
            boardingOperational: false,
            reassessmentDue: false,
            reassessmentOverdue: true,
            providerReassessmentDue: false,
            providerReassessmentOverdue: true,
            rnObservationReassessmentDue: false,
            rnObservationReassessmentOverdue: false,
            readyForDischarge: false,
            dispositionPhase: false,
            assignPhysicianGap: false,
            assignRnGap: true,
            resultsPending: false,
            criticalLabsUnacked: false,
          },
          vitalsAgeMs: null,
          vitalsStale: true,
          providerSignedAgeMs: null,
          firstDispositionDocAt: null,
          reassessmentLanes: {
            provider: { lastAtIso: null, due: false, overdue: true },
            rnObservation: { lastAtIso: null, due: false, overdue: false },
          },
          operationalBlockers: [],
          readinessLines: [],
        },
      }),
    ];
    const c = computeObservationBoardCensus(rows);
    expect(c.activeObservationPatients).toBe(1);
    expect(c.rnUnassignedCount).toBe(1);
    expect(c.providerUnassignedCount).toBe(0);
    expect(c.reassessmentOverdueCount).toBe(1);
    expect(c.providerReassessmentOverdueCount).toBe(1);
    expect(c.vitalsStaleCount).toBe(1);
  });
});

describe("observationBoardRowMatchesOperationalFilter", () => {
  it("matches unassigned when bag missing (STRICT; ED nurse alone is not ownership)", () => {
    const row = baseRow({
      nurseAssignedUserId: "ed-rn",
      observationOps: null,
      admissionSummaryJson: {},
    });
    expect(observationBoardRowMatchesOperationalFilter(row, "unassigned")).toBe(true);
  });

  it("matches pending_results when pending", () => {
    const row = baseRow({
      trackboardOps: { resultsPendingCount: 2, criticalResultUnacknowledged: false },
    });
    expect(observationBoardRowMatchesOperationalFilter(row, "pending_results")).toBe(true);
  });

  it("matches vitals_stale from snapshot", () => {
    const row = baseRow({
      observationOps: {
        anchorKind: "createdAt",
        anchorIso: new Date().toISOString(),
        losMs: 1000,
        losLabel: "0h01",
        losLabelCompact: "0h01",
        overnightUtcSpan: false,
        extendedStay24h: false,
        flags: {
          boardingOperational: false,
          reassessmentDue: false,
          reassessmentOverdue: false,
          providerReassessmentDue: false,
          providerReassessmentOverdue: false,
          rnObservationReassessmentDue: false,
          rnObservationReassessmentOverdue: false,
          readyForDischarge: false,
          dispositionPhase: false,
          assignPhysicianGap: false,
          assignRnGap: false,
          resultsPending: false,
          criticalLabsUnacked: false,
        },
        vitalsAgeMs: 9_000_000,
        vitalsStale: true,
        providerSignedAgeMs: null,
        firstDispositionDocAt: null,
        reassessmentLanes: {
          provider: { lastAtIso: null, due: false, overdue: false },
          rnObservation: { lastAtIso: null, due: false, overdue: false },
        },
        operationalBlockers: [],
        readinessLines: [],
      },
    });
    expect(observationBoardRowMatchesOperationalFilter(row, "vitals_stale")).toBe(true);
  });
});

describe("compareObservationBoardRows", () => {
  it("sorts pending_desc by pending count", () => {
    const low = baseRow({
      id: "low",
      createdAt: "2026-01-01T10:00:00.000Z",
      trackboardOps: { resultsPendingCount: 1, criticalResultUnacknowledged: false },
    });
    const high = baseRow({
      id: "high",
      createdAt: "2026-01-01T10:00:00.000Z",
      trackboardOps: { resultsPendingCount: 5, criticalResultUnacknowledged: false },
    });
    const sorted = [low, high].sort((a, b) => compareObservationBoardRows(a, b, "pending_desc"));
    expect(sorted[0]?.id).toBe("high");
  });
});

describe("computeObservationBoardStaffingPressure", () => {
  it("computes averages from bag PRIMARY_* (ignores ED columns)", () => {
    const rows: ObservationBoardRowInput[] = [
      baseRow({
        id: "1",
        admissionSummaryJson: summaryBag({ providerId: "md1", nurseId: "rn1" }),
        nurseAssignedUserId: "ed-wrong",
        physicianAssignedUserId: "ed-wrong",
      }),
      baseRow({
        id: "2",
        admissionSummaryJson: summaryBag({ providerId: null, nurseId: null }),
        nurseAssignedUserId: "",
        physicianAssignedUserId: "",
        triage: { esi: 2 },
        patient: { firstName: "Zed", lastName: "High" },
      }),
      baseRow({
        id: "3",
        admissionSummaryJson: summaryBag({ providerId: null, nurseId: "rn1" }),
        nurseAssignedUserId: "ed-wrong",
        physicianAssignedUserId: "",
        triage: { esi: 4 },
        patient: { firstName: "Bee", lastName: "Low" },
      }),
    ];
    const p = computeObservationBoardStaffingPressure(rows, { maxUnassignedRiskNames: 2 });
    expect(p.distinctRnIds).toBe(1);
    expect(p.avgPatientsPerRn).toBe(2);
    expect(p.unassignedEitherRolePatientCount).toBe(2);
    expect(p.highestRiskUnassignedPatientNames[0]).toContain("Zed");
  });
});

describe("observationRowOperationalAttentionScore", () => {
  it("scores ownership gaps", () => {
    const assigned = baseRow({
      admissionSummaryJson: summaryBag({ providerId: "md1", nurseId: "rn1" }),
    });
    const gap = baseRow({
      admissionSummaryJson: summaryBag({ providerId: null, nurseId: null }),
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
    });
    expect(observationRowOperationalAttentionScore(gap)).toBeGreaterThan(
      observationRowOperationalAttentionScore(assigned)
    );
  });
});
