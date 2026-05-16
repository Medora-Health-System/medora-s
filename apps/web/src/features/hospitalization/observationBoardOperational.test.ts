import { describe, expect, it } from "vitest";
import {
  compareObservationBoardRows,
  computeObservationBoardCensus,
  computeObservationBoardStaffingPressure,
  observationBoardRowMatchesOperationalFilter,
  observationRowOperationalAttentionScore,
  type ObservationBoardRowInput,
} from "./observationBoardOperational";

const baseRow = (over: Partial<ObservationBoardRowInput>): ObservationBoardRowInput => ({
  id: "e1",
  status: "OPEN",
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

  it("counts assignment gaps from snapshot flags when present", () => {
    const rows: ObservationBoardRowInput[] = [
      baseRow({
        id: "a",
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
  it("matches unassigned", () => {
    const row = baseRow({ nurseAssignedUserId: "", observationOps: null });
    expect(observationBoardRowMatchesOperationalFilter(row, "unassigned")).toBe(true);
  });

  it("matches pending_results when pending", () => {
    const row = baseRow({ trackboardOps: { resultsPendingCount: 2, criticalResultUnacknowledged: false } });
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
        vitalsAgeMs: 999,
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

describe("observationRowOperationalAttentionScore", () => {
  it("ranks critical above stable pending", () => {
    const critical = baseRow({
      observationOps: {
        anchorKind: "createdAt",
        anchorIso: new Date().toISOString(),
        losMs: 0,
        losLabel: "0h00",
        losLabelCompact: "0h00",
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
          criticalLabsUnacked: true,
        },
        vitalsAgeMs: null,
        vitalsStale: false,
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
    const pendingOnly = baseRow({
      trackboardOps: { resultsPendingCount: 1, criticalResultUnacknowledged: false },
      observationOps: critical.observationOps
        ? { ...critical.observationOps, flags: { ...critical.observationOps.flags, criticalLabsUnacked: false } }
        : null,
    });
    expect(observationRowOperationalAttentionScore(critical)).toBeGreaterThan(
      observationRowOperationalAttentionScore(pendingOnly)
    );
  });
});

describe("compareObservationBoardRows", () => {
  it("default sort orders by createdAt descending", () => {
    const older = baseRow({ id: "o", createdAt: "2026-01-01T10:00:00.000Z" });
    const newer = baseRow({ id: "n", createdAt: "2026-01-02T10:00:00.000Z" });
    const sorted = [older, newer].sort((a, b) => compareObservationBoardRows(a, b, "default"));
    expect(sorted[0]?.id).toBe("n");
  });

  it("pending_desc orders by pending count then recency", () => {
    const low = baseRow({
      id: "low",
      createdAt: "2026-01-03T10:00:00.000Z",
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
  it("computes averages and lists highest-risk unassigned", () => {
    const rows: ObservationBoardRowInput[] = [
      baseRow({ id: "1", nurseAssignedUserId: "rn1", physicianAssignedUserId: "md1" }),
      baseRow({
        id: "2",
        nurseAssignedUserId: "",
        physicianAssignedUserId: "",
        triage: { esi: 2 },
        patient: { firstName: "Zed", lastName: "High" },
      }),
      baseRow({
        id: "3",
        nurseAssignedUserId: "rn1",
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
