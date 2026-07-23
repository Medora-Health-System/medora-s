import { describe, expect, it } from "vitest";
import {
  actorHasAdmissionOperationalAcceptCapability,
  applyOperationalAdmissionAction,
  CLINICAL_ADMISSION_PACKET_PROTECTED_KEYS,
  emptyOperationalAcceptanceV1,
  mergeOperationalAcceptanceIntoSummary,
  readOperationalAcceptanceV1,
} from "./admissionOperationalAcceptanceD4a23.js";
import {
  applyCommandCenterSimulationOverlay,
  buildAdmissionCommandCenterRow,
  buildAdmissionOpsEventTimeline,
  computeAdmissionCommandCenterMetrics,
  filterAdmissionCommandCenterRows,
  formatAdmissionSlaDuration,
  sortAdmissionCommandCenterRows,
} from "./admissionCommandCenterD4a23.js";

describe("D4A.2.3 operational acceptance authorization", () => {
  it("grants PROVIDER, RN, ADMIN; denies billing-only", () => {
    expect(actorHasAdmissionOperationalAcceptCapability(["PROVIDER"])).toBe(true);
    expect(actorHasAdmissionOperationalAcceptCapability(["RN"])).toBe(true);
    expect(actorHasAdmissionOperationalAcceptCapability(["ADMIN"])).toBe(true);
    expect(actorHasAdmissionOperationalAcceptCapability(["RN", "PROVIDER"])).toBe(true);
    expect(actorHasAdmissionOperationalAcceptCapability(["BILLING"])).toBe(false);
    expect(actorHasAdmissionOperationalAcceptCapability(["FRONT_DESK"])).toBe(false);
  });

  it("dual-role retains ops capability even if first role is billing", () => {
    expect(actorHasAdmissionOperationalAcceptCapability(["BILLING", "RN"])).toBe(true);
  });

  it("idempotent accept with same clientRequestId", () => {
    const first = applyOperationalAdmissionAction({
      prior: null,
      action: "ACCEPT",
      actorUserId: "u1",
      actorRoleCodes: ["RN"],
      actorDisplayRole: "RN",
      at: "2026-07-22T12:00:00.000Z",
      clientRequestId: "req-1",
      receivingService: "Hospital Medicine",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = applyOperationalAdmissionAction({
      prior: first.ops,
      action: "ACCEPT",
      actorUserId: "u1",
      actorRoleCodes: ["RN"],
      actorDisplayRole: "RN",
      at: "2026-07-22T12:01:00.000Z",
      clientRequestId: "req-1",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.idempotentReplay).toBe(true);
  });

  it("does not rewrite clinical packet keys when merging ops", () => {
    const summary = {
      admissionReason: "Pneumonia",
      admissionDecisionMode: "SIGN",
      admissionDecisionAt: "2026-07-22T11:00:00.000Z",
      admissionDecisionByUserId: "phys-1",
      initialPlan: "IV abx",
    };
    const applied = applyOperationalAdmissionAction({
      prior: emptyOperationalAcceptanceV1(),
      action: "ACCEPT",
      actorUserId: "rn-1",
      actorRoleCodes: ["RN"],
      actorDisplayRole: "RN",
      at: "2026-07-22T11:10:00.000Z",
      clientRequestId: "req-2",
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const merged = mergeOperationalAcceptanceIntoSummary(summary, applied.ops);
    for (const key of CLINICAL_ADMISSION_PACKET_PROTECTED_KEYS) {
      if (key in summary) {
        expect(merged[key]).toEqual((summary as Record<string, unknown>)[key]);
      }
    }
    expect(readOperationalAcceptanceV1(merged)?.status).toBe("ACCEPTED");
  });

  it("bed assignment derived timeline does not imply receiving acceptance", () => {
    const events = buildAdmissionOpsEventTimeline({
      admissionSummaryJson: {
        admissionDecisionMode: "SIGN",
        admissionDecisionAt: "2026-07-22T10:00:00.000Z",
      },
      placementStatus: "BED_ASSIGNED",
      placementRequestedAt: "2026-07-22T10:05:00.000Z",
      placementAssignedAt: "2026-07-22T10:20:00.000Z",
      assignedUnitCode: "MS",
      assignedBedKey: "A1",
    });
    expect(events.some((e) => e.type === "BED_ASSIGNED")).toBe(true);
    expect(events.some((e) => e.type === "RECEIVING_ACCEPTED")).toBe(false);
  });
});

describe("D4A.2.3 command center row / SLA / filters", () => {
  const signedSummary = {
    admissionDecisionMode: "SIGN",
    admissionDecisionAt: "2026-07-22T10:00:00.000Z",
    admissionDecisionByUserId: "phys-1",
    admissionDiagnosis: "Pneumonia",
    serviceUnit: "Hospital Medicine",
    careLevel: "TELEMETRY",
    conditionAtAdmission: "STABLE",
    responsiblePhysicianName: "Dr. A",
  };

  it("placement-off signed decision shows waiting for placement without false submit", () => {
    const row = buildAdmissionCommandCenterRow({
      encounterId: "e1",
      facilityId: "f1",
      patientDisplayName: "Smith, John",
      roomLabel: "ED-6",
      encounterType: "EMERGENCY",
      admissionSummaryJson: signedSummary,
      placementWorkflowEnabled: false,
      nowMs: Date.parse("2026-07-22T10:18:00.000Z"),
    });
    expect(row.operationalFilter).toBe("WAITING_FOR_PLACEMENT");
    expect(row.inpatientEncounterStatus).toBe("NOT_CREATED");
    expect(row.falselyImpliesPlacementSubmitted).toBe(false);
    expect(row.hasDurablePlacementRequest).toBe(false);
    expect(row.elapsedSinceDecisionMs).toBe(18 * 60 * 1000);
  });

  it("formatAdmissionSlaDuration and reload-stable elapsed from durable timestamp", () => {
    expect(formatAdmissionSlaDuration(8 * 60 * 1000)).toBe("8 min");
    expect(formatAdmissionSlaDuration(76 * 60 * 1000)).toBe("1 hr 16 min");
    expect(formatAdmissionSlaDuration(185 * 60 * 1000)).toBe("3 hr 05 min");
    expect(formatAdmissionSlaDuration(null)).toBeNull();
  });

  it("filters and longest-wait sort", () => {
    const a = buildAdmissionCommandCenterRow({
      encounterId: "e1",
      facilityId: "f1",
      patientDisplayName: "A",
      admissionSummaryJson: signedSummary,
      placementWorkflowEnabled: false,
      nowMs: Date.parse("2026-07-22T10:30:00.000Z"),
    });
    const b = buildAdmissionCommandCenterRow({
      encounterId: "e2",
      facilityId: "f1",
      patientDisplayName: "B",
      admissionSummaryJson: {
        ...signedSummary,
        admissionDecisionAt: "2026-07-22T10:20:00.000Z",
      },
      placementWorkflowEnabled: false,
      nowMs: Date.parse("2026-07-22T10:30:00.000Z"),
    });
    const filtered = filterAdmissionCommandCenterRows([a, b], "WAITING_FOR_PLACEMENT");
    expect(filtered).toHaveLength(2);
    const sorted = sortAdmissionCommandCenterRows(filtered, "LONGEST_WAITING");
    expect(sorted[0]?.encounterId).toBe("e1");
  });

  it("metrics are live operational only", () => {
    const row = buildAdmissionCommandCenterRow({
      encounterId: "e1",
      facilityId: "f1",
      admissionSummaryJson: signedSummary,
      placementWorkflowEnabled: false,
      nowMs: Date.parse("2026-07-22T11:00:00.000Z"),
    });
    const m = computeAdmissionCommandCenterMetrics([row]);
    expect(m.metricsKind).toBe("LIVE_OPERATIONAL");
    expect(m.pendingAdmissions).toBe(1);
    expect(m.waitingForPlacement).toBe(1);
  });

  it("simulation overlay never claims durable placement submit and resets via NONE", () => {
    const row = buildAdmissionCommandCenterRow({
      encounterId: "e1",
      facilityId: "f1",
      admissionSummaryJson: signedSummary,
      placementWorkflowEnabled: false,
      nowMs: Date.now(),
    });
    const sim = applyCommandCenterSimulationOverlay(row, "RECEIVING_NURSE_ACCEPTED");
    expect(sim.receivingAcceptance).toBe("ACCEPTED");
    expect(sim.lastOperationalActor).toContain("SIMULATION");
    const reset = applyCommandCenterSimulationOverlay(row, "NONE");
    expect(reset.operationalFilter).toBe("WAITING_FOR_PLACEMENT");
  });
});
