import { describe, expect, it } from "vitest";
import {
  computeObservationOperationalSnapshot,
  computeObservationStaySummaryForExport,
  OBSERVATION_REASSESSMENT_DUE_MS,
  OBSERVATION_REASSESSMENT_OVERDUE_MS,
  OBSERVATION_VITALS_STALE_MS,
  resolveObservationLosAnchorMs,
} from "./observationOperational";

const emptyOps = {
  resultsPendingCount: 0,
  criticalResultUnacknowledged: false,
  lastNursingReassessmentAt: null,
  firstDispositionDocAt: null,
  lastTriageVitalsRecordedAt: null,
};

describe("resolveObservationLosAnchorMs", () => {
  it("prefers admittedAt over createdAt", () => {
    const r = resolveObservationLosAnchorMs({
      admittedAt: "2024-06-01T10:00:00.000Z",
      createdAt: "2024-06-01T08:00:00.000Z",
    });
    expect(r?.anchorKind).toBe("admittedAt");
    expect(r?.anchorMs).toBe(new Date("2024-06-01T10:00:00.000Z").getTime());
  });

  it("falls back to createdAt when admittedAt missing", () => {
    const r = resolveObservationLosAnchorMs({
      admittedAt: null,
      createdAt: "2024-06-01T08:00:00.000Z",
    });
    expect(r?.anchorKind).toBe("createdAt");
  });

  it("returns null when neither timestamp parses", () => {
    expect(resolveObservationLosAnchorMs({ admittedAt: "x", createdAt: null })).toBeNull();
  });
});

describe("computeObservationOperationalSnapshot", () => {
  it("returns null for EMERGENCY", () => {
    expect(
      computeObservationOperationalSnapshot({
        encounterType: "EMERGENCY",
        status: "OPEN",
        workflowState: "IN_TREATMENT",
        admittedAt: "2024-06-01T10:00:00.000Z",
        createdAt: "2024-06-01T08:00:00.000Z",
        physicianAssignedUserId: "u1",
        nurseAssignedUserId: "u2",
        providerDocumentationStatus: "SIGNED",
        providerDocumentationSignedAt: "2024-06-01T11:00:00.000Z",
        trackboardOps: emptyOps,
        nowMs: new Date("2024-06-01T12:00:00.000Z").getTime(),
      })
    ).toBeNull();
  });

  it("never returns negative LOS", () => {
    const now = new Date("2024-06-01T12:00:00.000Z").getTime();
    const snap = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: new Date(now + 60000).toISOString(),
      createdAt: "2024-06-01T08:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: emptyOps,
      nowMs: now,
    });
    expect(snap?.losMs).toBe(0);
  });

  it("flags overnightUtcSpan across UTC midnight", () => {
    const anchor = new Date("2024-06-01T22:00:00.000Z").getTime();
    const now = new Date("2024-06-02T01:00:00.000Z").getTime();
    const snap = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: new Date(anchor).toISOString(),
      createdAt: "2024-06-01T08:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: emptyOps,
      nowMs: now,
    });
    expect(snap?.overnightUtcSpan).toBe(true);
  });

  it("flags extendedStay24h at 24h boundary", () => {
    const anchor = new Date("2024-06-01T00:00:00.000Z").getTime();
    const snap = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: new Date(anchor).toISOString(),
      createdAt: "2024-05-01T00:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: emptyOps,
      nowMs: anchor + 24 * 60 * 60 * 1000,
    });
    expect(snap?.extendedStay24h).toBe(true);
  });

  it("marks reassessment overdue from anchor when no reassessment event", () => {
    const anchor = new Date("2024-06-01T00:00:00.000Z").getTime();
    const snap = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: new Date(anchor).toISOString(),
      createdAt: "2024-06-01T00:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: { ...emptyOps, lastNursingReassessmentAt: null },
      nowMs: anchor + OBSERVATION_REASSESSMENT_OVERDUE_MS + 60_000,
    });
    expect(snap?.flags.reassessmentOverdue).toBe(true);
    expect(snap?.flags.reassessmentDue).toBe(false);
  });

  it("marks reassessment due (not overdue) between 2h and 4h without reassessment", () => {
    const anchor = new Date("2024-06-01T00:00:00.000Z").getTime();
    const snap = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: new Date(anchor).toISOString(),
      createdAt: "2024-06-01T00:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: { ...emptyOps, lastNursingReassessmentAt: null },
      nowMs: anchor + OBSERVATION_REASSESSMENT_DUE_MS + 30 * 60 * 1000,
    });
    expect(snap?.flags.reassessmentDue).toBe(true);
    expect(snap?.flags.reassessmentOverdue).toBe(false);
  });

  it("flags vitals stale when last triage vitals older than 4h", () => {
    const now = new Date("2024-06-01T12:00:00.000Z").getTime();
    const vitalsAt = new Date(now - OBSERVATION_VITALS_STALE_MS - 60_000).toISOString();
    const snap = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: new Date(now - 60 * 60 * 1000).toISOString(),
      createdAt: "2024-06-01T06:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: { ...emptyOps, lastTriageVitalsRecordedAt: vitalsAt },
      nowMs: now,
    });
    expect(snap?.vitalsStale).toBe(true);
  });

  it("flags boardingOperational for ARRIVED workflow", () => {
    const now = new Date("2024-06-01T12:00:00.000Z").getTime();
    const snap = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "ARRIVED",
      admittedAt: new Date(now - 60 * 60 * 1000).toISOString(),
      createdAt: "2024-06-01T06:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: emptyOps,
      nowMs: now,
    });
    expect(snap?.flags.boardingOperational).toBe(true);
  });

  it("flags readyForDischarge and dispositionPhase", () => {
    const t = new Date("2024-06-01T12:00:00.000Z").getTime();
    const ready = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "DISCHARGE_READY",
      admittedAt: new Date(t - 3600_000).toISOString(),
      createdAt: "2024-06-01T06:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "SIGNED",
      providerDocumentationSignedAt: "2024-06-01T11:00:00.000Z",
      trackboardOps: emptyOps,
      nowMs: t,
    });
    expect(ready?.flags.readyForDischarge).toBe(true);
    expect(ready?.flags.dispositionPhase).toBe(false);

    const disp = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "DISPOSITION",
      admittedAt: new Date(t - 3600_000).toISOString(),
      createdAt: "2024-06-01T06:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: emptyOps,
      nowMs: t,
    });
    expect(disp?.flags.dispositionPhase).toBe(true);
    expect(disp?.flags.readyForDischarge).toBe(false);
  });

  it("flags assignment gaps", () => {
    const t = new Date("2024-06-01T12:00:00.000Z").getTime();
    const snap = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: new Date(t - 3600_000).toISOString(),
      createdAt: "2024-06-01T06:00:00.000Z",
      physicianAssignedUserId: null,
      nurseAssignedUserId: "",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: emptyOps,
      nowMs: t,
    });
    expect(snap?.flags.assignPhysicianGap).toBe(true);
    expect(snap?.flags.assignRnGap).toBe(true);
  });
});

describe("computeObservationStaySummaryForExport", () => {
  it("returns non-applicable empty shape for non-INPATIENT", () => {
    const s = computeObservationStaySummaryForExport({
      encounterType: "EMERGENCY",
      admittedAt: "2024-06-01T10:00:00.000Z",
      createdAt: "2024-06-01T08:00:00.000Z",
      dischargedAt: "2024-06-01T18:00:00.000Z",
    });
    expect(s.applicable).toBe(false);
    expect(s.carePathLabel).toBeNull();
  });

  it("computes LOS from admittedAt to dischargedAt for INPATIENT", () => {
    const s = computeObservationStaySummaryForExport({
      encounterType: "INPATIENT",
      admittedAt: "2024-06-01T08:00:00.000Z",
      createdAt: "2024-06-01T06:00:00.000Z",
      dischargedAt: "2024-06-01T20:00:00.000Z",
    });
    expect(s.applicable).toBe(true);
    expect(s.observationLosHours).toBe(12);
    expect(s.preview).toBe(false);
    expect(s.anchorKind).toBe("admittedAt");
  });

  it("never returns negative LOS when end precedes anchor", () => {
    const s = computeObservationStaySummaryForExport({
      encounterType: "INPATIENT",
      admittedAt: "2024-06-01T20:00:00.000Z",
      createdAt: "2024-06-01T06:00:00.000Z",
      dischargedAt: "2024-06-01T08:00:00.000Z",
    });
    expect(s.observationLosMinutes).toBe(0);
    expect(s.observationLosHours).toBe(0);
  });

  it("sets preview when using previewNowMs without discharge", () => {
    const s = computeObservationStaySummaryForExport({
      encounterType: "INPATIENT",
      admittedAt: "2024-06-01T08:00:00.000Z",
      createdAt: "2024-06-01T06:00:00.000Z",
      dischargedAt: null,
      previewNowMs: new Date("2024-06-01T10:00:00.000Z").getTime(),
    });
    expect(s.preview).toBe(true);
    expect(s.stayEndIso).toBe("2024-06-01T10:00:00.000Z");
  });
});
