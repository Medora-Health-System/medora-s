import { BadRequestException } from "@nestjs/common";
import {
  evaluateIvpbDoseSessionEligibility,
  isForbiddenIvpbDoseStatusTransition,
  resolveIvpbDoseStatusTransition,
} from "@medora/shared";
import { resolveLoadedIvpbDoseSessionMarContext } from "./medication-ivpb-dose-session-mar.util";

const baseDose = {
  id: "dose-1",
  facilityId: "fac-1",
  encounterId: "enc-1",
  orderId: "order-1",
  orderItemId: "oi-1",
  medicationOrderScheduleId: "sched-1",
  doseSequenceNumber: 1,
  doseKind: "IVPB_SESSION",
  scheduledAt: new Date(),
  dueWindowStartAt: new Date(),
  dueWindowEndAt: new Date(),
  overdueAt: null,
  doseStatus: "DUE",
  scheduleClassificationSnapshot: "RECURRING_IVPB",
  frequencySnapshotJson: {},
  medicationCatalogSnapshotJson: {},
  orderedDoseSnapshotJson: {},
  infusionSessionId: null,
  responseDueAt: null,
  terminalMedicationAdministrationId: null,
  missedReason: null,
  cancelledAt: null,
  cancelReason: null,
  supersededAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  medicationOrderSchedule: {
    id: "sched-1",
    facilityId: "fac-1",
    encounterId: "enc-1",
    orderId: "order-1",
    orderItemId: "oi-1",
    frequencyCode: "Q12H",
    catalogVersion: 1,
    frequencySnapshotJson: {},
    medicationCatalogSnapshotJson: {},
    scheduleClassification: "RECURRING_IVPB",
    scheduleStatus: "ACTIVE",
    version: 1,
    supersededByScheduleId: null,
    supersededAt: null,
    cancelledAt: null,
    cancelledByUserId: null,
    cancelReason: null,
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
} as const;

const flagsOn = {
  MEDICATION_SCHEDULING_V1: true,
  MEDICATION_DOSE_INSTANCES: true,
  MEDICATION_IVPB_DOSE_SCHEDULING: true,
  MEDICATION_DOSE_GATED_MAR: false,
  MEDICATION_RESPONSE_ENGINE: false,
  HOSPITAL_EMAR: false,
};

describe("medication-ivpb-dose-session-mar.util (M1.8B.7J.3)", () => {
  it("START resolves IN_PROGRESS from DUE", () => {
    const ctx = resolveLoadedIvpbDoseSessionMarContext({
      doseInstance: baseDose as never,
      featureFlags: flagsOn,
      action: "START",
      infusionSessionId: "session-1",
      requestOrderItemId: "oi-1",
      requestEncounterId: "enc-1",
      requestFacilityId: "fac-1",
    });
    expect(ctx.nextDoseStatus).toBe("IN_PROGRESS");
    expect(ctx.skipOrderLineCompletion).toBe(false);
  });

  it("STOP resolves COMPLETED and skips order line completion", () => {
    const ctx = resolveLoadedIvpbDoseSessionMarContext({
      doseInstance: {
        ...baseDose,
        doseStatus: "IN_PROGRESS",
        infusionSessionId: "session-1",
      } as never,
      featureFlags: flagsOn,
      action: "STOP",
      infusionSessionId: "session-1",
      requestOrderItemId: "oi-1",
      requestEncounterId: "enc-1",
      requestFacilityId: "fac-1",
    });
    expect(ctx.nextDoseStatus).toBe("COMPLETED");
    expect(ctx.skipOrderLineCompletion).toBe(true);
  });

  it("rejects START from PLANNED", () => {
    expect(() =>
      resolveLoadedIvpbDoseSessionMarContext({
        doseInstance: { ...baseDose, doseStatus: "PLANNED" } as never,
        featureFlags: flagsOn,
        action: "START",
        infusionSessionId: "session-1",
        requestOrderItemId: "oi-1",
        requestEncounterId: "enc-1",
        requestFacilityId: "fac-1",
      })
    ).toThrow(BadRequestException);
  });

  it("shared contracts reject forbidden transitions", () => {
    expect(isForbiddenIvpbDoseStatusTransition("COMPLETED", "IN_PROGRESS")).toBe(true);
    expect(isForbiddenIvpbDoseStatusTransition("MISSED", "IN_PROGRESS")).toBe(true);
    expect(isForbiddenIvpbDoseStatusTransition("HELD", "COMPLETED")).toBe(true);
    expect(resolveIvpbDoseStatusTransition({ currentStatus: "IN_PROGRESS", action: "STOP" }).ok).toBe(
      true
    );
    expect(
      evaluateIvpbDoseSessionEligibility({
        doseKind: "IVPB_SESSION",
        doseStatus: "DUE",
        scheduleClassification: "RECURRING_IVPB",
        action: "START",
      })
    ).toMatchObject({ eligible: true });
  });
});
