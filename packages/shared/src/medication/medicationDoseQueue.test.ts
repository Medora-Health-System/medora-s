import { describe, expect, it } from "vitest";
import { MEDICATION_DOSE_STATUSES } from "./medicationDoseStatus.js";
import {
  MEDICATION_DOSE_INSTANCE_QUEUE_BUCKETS,
  MEDICATION_NON_DOSE_QUEUE_BUCKETS,
  MEDICATION_PASS_QUEUE_BUCKETS,
  MEDICATION_PASS_QUEUE_IVPB_BADGE,
  mapDoseInstanceToPassQueueBucket,
  mapMedicationDoseStatusToPassQueueBucket,
  resolveIvpbSessionPassQueueClinicalAction,
} from "./medicationDoseQueue.js";

describe("medicationDoseQueue (M1.8B.7F.1)", () => {
  it("defines stable pass queue buckets", () => {
    expect(MEDICATION_PASS_QUEUE_BUCKETS).toEqual([
      "DUE",
      "OVERDUE",
      "IN_PROGRESS",
      "HELD",
      "UPCOMING",
      "PRN_AVAILABLE",
      "ACTIVE_INFUSION",
    ]);
    expect(MEDICATION_DOSE_INSTANCE_QUEUE_BUCKETS).toHaveLength(5);
    expect(MEDICATION_NON_DOSE_QUEUE_BUCKETS).toEqual(["PRN_AVAILABLE", "ACTIVE_INFUSION"]);
  });

  it("maps operational dose statuses to matching buckets", () => {
    expect(mapMedicationDoseStatusToPassQueueBucket("DUE")).toBe("DUE");
    expect(mapMedicationDoseStatusToPassQueueBucket("OVERDUE")).toBe("OVERDUE");
    expect(mapMedicationDoseStatusToPassQueueBucket("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(mapMedicationDoseStatusToPassQueueBucket("HELD")).toBe("HELD");
  });

  it("maps PLANNED to UPCOMING", () => {
    expect(mapMedicationDoseStatusToPassQueueBucket("PLANNED")).toBe("UPCOMING");
  });

  it("terminal statuses do not map to active pass queue buckets", () => {
    for (const status of ["COMPLETED", "MISSED", "CANCELLED", "SUPERSEDED"] as const) {
      expect(mapMedicationDoseStatusToPassQueueBucket(status)).toBeNull();
    }
  });

  it("every non-terminal dose status maps to a dose-instance bucket", () => {
    const terminal = new Set(["COMPLETED", "MISSED", "CANCELLED", "SUPERSEDED"]);
    for (const status of MEDICATION_DOSE_STATUSES) {
      if (terminal.has(status)) continue;
      const bucket = mapMedicationDoseStatusToPassQueueBucket(status);
      expect(bucket).not.toBeNull();
      expect(MEDICATION_DOSE_INSTANCE_QUEUE_BUCKETS).toContain(bucket);
    }
  });
});

describe("IVPB_SESSION pass queue mapping (M1.8B.7J.4)", () => {
  it("maps IVPB_SESSION IN_PROGRESS to ACTIVE_INFUSION when flag ON", () => {
    expect(
      mapDoseInstanceToPassQueueBucket({
        doseKind: "IVPB_SESSION",
        doseStatus: "IN_PROGRESS",
        ivpbSchedulingEnabled: true,
      })
    ).toBe("ACTIVE_INFUSION");
  });

  it("maps IVPB_SESSION DUE/OVERDUE/PLANNED like fixed doses when flag ON", () => {
    expect(
      mapDoseInstanceToPassQueueBucket({
        doseKind: "IVPB_SESSION",
        doseStatus: "DUE",
        ivpbSchedulingEnabled: true,
      })
    ).toBe("DUE");
    expect(
      mapDoseInstanceToPassQueueBucket({
        doseKind: "IVPB_SESSION",
        doseStatus: "OVERDUE",
        ivpbSchedulingEnabled: true,
      })
    ).toBe("OVERDUE");
    expect(
      mapDoseInstanceToPassQueueBucket({
        doseKind: "IVPB_SESSION",
        doseStatus: "PLANNED",
        ivpbSchedulingEnabled: true,
      })
    ).toBe("UPCOMING");
  });

  it("hides IVPB_SESSION when IVPB scheduling flag OFF", () => {
    expect(
      mapDoseInstanceToPassQueueBucket({
        doseKind: "IVPB_SESSION",
        doseStatus: "DUE",
        ivpbSchedulingEnabled: false,
      })
    ).toBeNull();
  });

  it("preserves FIXED_ADMINISTRATION IN_PROGRESS as IN_PROGRESS bucket", () => {
    expect(
      mapDoseInstanceToPassQueueBucket({
        doseKind: "FIXED_ADMINISTRATION",
        doseStatus: "IN_PROGRESS",
        ivpbSchedulingEnabled: true,
      })
    ).toBe("IN_PROGRESS");
  });

  it("resolves IVPB clinical actions by status", () => {
    expect(resolveIvpbSessionPassQueueClinicalAction("DUE")).toBe("START_INFUSION");
    expect(resolveIvpbSessionPassQueueClinicalAction("OVERDUE")).toBe("START_INFUSION");
    expect(resolveIvpbSessionPassQueueClinicalAction("IN_PROGRESS")).toBe("STOP_INFUSION");
    expect(resolveIvpbSessionPassQueueClinicalAction("PLANNED")).toBe("VIEW_UPCOMING");
    expect(resolveIvpbSessionPassQueueClinicalAction("HELD")).toBeNull();
  });

  it("exposes IVPB queue badge constant", () => {
    expect(MEDICATION_PASS_QUEUE_IVPB_BADGE).toBe("IVPB");
  });
});
