import { describe, expect, it } from "vitest";
import {
  computeObservationOperationalSnapshot,
  computeObservationReassessmentLaneState,
  computeObservationStaySummaryForExport,
  mergeObservationTrackboardOpsInput,
  OBSERVATION_REASSESSMENT_DUE_MS,
  OBSERVATION_REASSESSMENT_OVERDUE_MS,
  OBSERVATION_VITALS_STALE_MS,
  resolveObservationLosAnchorMs,
} from "./observationOperational";

const emptyOps = {
  resultsPendingCount: 0,
  criticalResultUnacknowledged: false,
  lastNursingReassessmentAt: null,
  lastProviderObservationReassessmentAt: null,
  lastRnObservationReassessmentAt: null,
  firstDispositionDocAt: null,
  lastTriageVitalsRecordedAt: null,
};

describe("mergeObservationTrackboardOpsInput", () => {
  it("prefers triageLastAt over trackboard lastTriageVitalsRecordedAt", () => {
    const merged = mergeObservationTrackboardOpsInput(
      { lastTriageVitalsRecordedAt: "2024-06-01T08:00:00.000Z" },
      "2024-06-01T09:00:00.000Z"
    );
    expect(merged.lastTriageVitalsRecordedAt).toBe("2024-06-01T09:00:00.000Z");
  });

  it("falls back to trackboard when triage missing", () => {
    const merged = mergeObservationTrackboardOpsInput(
      { lastTriageVitalsRecordedAt: "2024-06-01T08:00:00.000Z", resultsPendingCount: 2 },
      undefined
    );
    expect(merged.lastTriageVitalsRecordedAt).toBe("2024-06-01T08:00:00.000Z");
    expect(merged.resultsPendingCount).toBe(2);
  });

  it("preserves lastProviderObservationReassessmentAt from trackboard", () => {
    const merged = mergeObservationTrackboardOpsInput(
      { lastProviderObservationReassessmentAt: "2024-06-01T10:00:00.000Z" },
      undefined
    );
    expect(merged.lastProviderObservationReassessmentAt).toBe("2024-06-01T10:00:00.000Z");
  });

  it("preserves lastRnObservationReassessmentAt from trackboard", () => {
    const merged = mergeObservationTrackboardOpsInput(
      { lastRnObservationReassessmentAt: "2024-06-01T11:00:00.000Z" },
      undefined
    );
    expect(merged.lastRnObservationReassessmentAt).toBe("2024-06-01T11:00:00.000Z");
  });
});

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

describe("computeObservationReassessmentLaneState", () => {
  const anchor = new Date("2024-06-01T12:00:00.000Z").getTime();

  it("uses anchor when no event", () => {
    const now = anchor + OBSERVATION_REASSESSMENT_OVERDUE_MS + 60_000;
    expect(computeObservationReassessmentLaneState({ anchorMs: anchor, nowMs: now, lastEventMs: null })).toEqual({
      due: false,
      overdue: true,
    });
  });

  it("uses time since last event when on or after anchor", () => {
    const last = anchor + 60 * 60 * 1000;
    const now = last + OBSERVATION_REASSESSMENT_DUE_MS + 30 * 60 * 1000;
    expect(computeObservationReassessmentLaneState({ anchorMs: anchor, nowMs: now, lastEventMs: last })).toEqual({
      due: true,
      overdue: false,
    });
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

  it("13G-C: provider and RN observation reassessment lanes are independent", () => {
    const now = new Date("2024-06-01T14:00:00.000Z").getTime();
    const snapRnOverdueProviderOk = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: "2024-06-01T06:00:00.000Z",
      createdAt: "2024-06-01T04:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: {
        ...emptyOps,
        lastRnObservationReassessmentAt: "2024-06-01T06:30:00.000Z",
        lastProviderObservationReassessmentAt: "2024-06-01T13:30:00.000Z",
      },
      nowMs: now,
    });
    expect(snapRnOverdueProviderOk?.flags.providerReassessmentOverdue).toBe(false);
    expect(snapRnOverdueProviderOk?.flags.rnObservationReassessmentOverdue).toBe(true);
    expect(snapRnOverdueProviderOk?.flags.reassessmentOverdue).toBe(true);

    const snapBothFresh = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: "2024-06-01T12:00:00.000Z",
      createdAt: "2024-06-01T08:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: {
        ...emptyOps,
        lastRnObservationReassessmentAt: "2024-06-01T13:30:00.000Z",
        lastProviderObservationReassessmentAt: "2024-06-01T13:45:00.000Z",
      },
      nowMs: now,
    });
    expect(snapBothFresh?.flags.reassessmentOverdue).toBe(false);
    expect(snapBothFresh?.flags.reassessmentDue).toBe(false);
  });

  it("does not use legacy lastNursingReassessmentAt for observation lane clocks", () => {
    const now = new Date("2024-06-01T14:00:00.000Z").getTime();
    const snap = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: "2024-06-01T12:00:00.000Z",
      createdAt: "2024-06-01T08:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: {
        ...emptyOps,
        lastNursingReassessmentAt: "2024-06-01T13:55:00.000Z",
        lastRnObservationReassessmentAt: null,
        lastProviderObservationReassessmentAt: null,
      },
      nowMs: now,
    });
    expect(snap?.flags.reassessmentOverdue).toBe(false);
    expect(snap?.flags.reassessmentDue).toBe(true);
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

  it("13G-C: operational blockers sort critical before vitals and pending results", () => {
    const t = new Date("2024-06-01T12:00:00.000Z").getTime();
    const vitalsAt = new Date(t - OBSERVATION_VITALS_STALE_MS - 60_000).toISOString();
    const snap = computeObservationOperationalSnapshot({
      encounterType: "INPATIENT",
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      admittedAt: new Date(t - 8 * 3600_000).toISOString(),
      createdAt: "2024-06-01T00:00:00.000Z",
      physicianAssignedUserId: "p",
      nurseAssignedUserId: "n",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      trackboardOps: {
        ...emptyOps,
        criticalResultUnacknowledged: true,
        resultsPendingCount: 1,
        lastTriageVitalsRecordedAt: vitalsAt,
      },
      nowMs: t,
    });
    const ids = snap!.operationalBlockers.map((b) => b.id);
    expect(ids[0]).toBe("CRITICAL_RESULT_UNACKED");
    expect(ids.indexOf("VITALS_STALE")).toBeLessThan(ids.indexOf("PENDING_RESULTS"));
  });

  it("13G-C: readiness highlights discharge workflow when workflowState is DISCHARGE_READY", () => {
    const t = new Date("2024-06-01T12:00:00.000Z").getTime();
    const snap = computeObservationOperationalSnapshot({
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
    const readyLine = snap!.readinessLines.find((l) => l.id === "READY_FOR_DISCHARGE_WORKFLOW");
    expect(readyLine?.active).toBe(true);
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
