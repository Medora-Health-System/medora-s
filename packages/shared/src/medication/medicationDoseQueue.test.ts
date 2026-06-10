import { describe, expect, it } from "vitest";
import { MEDICATION_DOSE_STATUSES } from "./medicationDoseStatus.js";
import {
  MEDICATION_DOSE_INSTANCE_QUEUE_BUCKETS,
  MEDICATION_NON_DOSE_QUEUE_BUCKETS,
  MEDICATION_PASS_QUEUE_BUCKETS,
  mapMedicationDoseStatusToPassQueueBucket,
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
