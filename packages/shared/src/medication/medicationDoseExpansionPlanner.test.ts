import { describe, expect, it } from "vitest";
import {
  MEDICATION_DOSE_EXPANSION_HORIZON_MS,
  MEDICATION_DOSE_FIXED_DAILY_CLOCK_SLOTS,
} from "./medicationDosePassWindowDefaults.js";
import {
  filterUnmaterializedMedicationDoseSlots,
  planMedicationDoseExpansionSlots,
  wallClockToUtc,
} from "./medicationDoseExpansionPlanner.js";
import type { MedicationFrequencySnapshotJson } from "./medicationOrderScheduleSnapshot.js";

function freqSnapshot(
  overrides: Partial<MedicationFrequencySnapshotJson> &
    Pick<MedicationFrequencySnapshotJson, "expansionStrategy" | "frequencyCode">
): MedicationFrequencySnapshotJson {
  return {
    frequencyCode: overrides.frequencyCode,
    scheduleClassification: "RECURRING",
    expansionStrategy: overrides.expansionStrategy,
    intervalMinutes: overrides.intervalMinutes ?? null,
    dosesPerDay: overrides.dosesPerDay ?? null,
    category: overrides.category ?? "FIXED_DAILY",
    mealAnchor: overrides.mealAnchor ?? "NONE",
    prnModifierAllowed: false,
    statCompatible: false,
    catalogVersion: 1,
    displayNameEn: overrides.displayNameEn ?? overrides.frequencyCode,
    displayNameFr: overrides.displayNameFr ?? overrides.frequencyCode,
    snapshottedAt: overrides.snapshottedAt ?? "2026-06-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("medicationDoseExpansionPlanner (M1.8B.7H.1)", () => {
  const anchorAt = new Date("2026-06-10T10:00:00.000Z");
  const horizonEndAt = new Date(anchorAt.getTime() + MEDICATION_DOSE_EXPANSION_HORIZON_MS);

  it("Q6H produces interval slots through 72h horizon", () => {
    const result = planMedicationDoseExpansionSlots({
      anchorAt,
      horizonEndAt,
      facilityTimeZone: "UTC",
      frequencySnapshotJson: freqSnapshot({
        frequencyCode: "Q6H",
        expansionStrategy: "INTERVAL_FROM_ANCHOR",
        intervalMinutes: 360,
        dosesPerDay: 4,
        category: "INTERVAL",
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.slots).toHaveLength(13);
    expect(result.slots[0]!.doseSequenceNumber).toBe(1);
    expect(result.slots[0]!.scheduledAt.toISOString()).toBe("2026-06-10T10:00:00.000Z");
    expect(result.slots[1]!.scheduledAt.toISOString()).toBe("2026-06-10T16:00:00.000Z");
    expect(result.slots.at(-1)!.scheduledAt.toISOString()).toBe("2026-06-13T10:00:00.000Z");
  });

  it("BID produces 6 slots in 72h", () => {
    const result = planMedicationDoseExpansionSlots({
      anchorAt,
      horizonEndAt,
      facilityTimeZone: "UTC",
      frequencySnapshotJson: freqSnapshot({
        frequencyCode: "BID",
        expansionStrategy: "FIXED_DAILY_CLOCK",
        dosesPerDay: 2,
        category: "FIXED_DAILY",
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slots).toHaveLength(6);
    expect(result.slots.map((s) => s.scheduledAt.toISOString())).toEqual([
      "2026-06-10T21:00:00.000Z",
      "2026-06-11T09:00:00.000Z",
      "2026-06-11T21:00:00.000Z",
      "2026-06-12T09:00:00.000Z",
      "2026-06-12T21:00:00.000Z",
      "2026-06-13T09:00:00.000Z",
    ]);
  });

  it("TID produces 9 slots in 72h", () => {
    const result = planMedicationDoseExpansionSlots({
      anchorAt,
      horizonEndAt,
      facilityTimeZone: "UTC",
      frequencySnapshotJson: freqSnapshot({
        frequencyCode: "TID",
        expansionStrategy: "FIXED_DAILY_CLOCK",
        dosesPerDay: 3,
        category: "FIXED_DAILY",
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slots).toHaveLength(9);
  });

  it("QID produces 12 slots in 72h", () => {
    const result = planMedicationDoseExpansionSlots({
      anchorAt,
      horizonEndAt,
      facilityTimeZone: "UTC",
      frequencySnapshotJson: freqSnapshot({
        frequencyCode: "QID",
        expansionStrategy: "FIXED_DAILY_CLOCK",
        dosesPerDay: 4,
        category: "FIXED_DAILY",
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slots).toHaveLength(12);
  });

  it("assigns monotonic sequence numbers without gaps", () => {
    const result = planMedicationDoseExpansionSlots({
      anchorAt,
      horizonEndAt,
      facilityTimeZone: "UTC",
      frequencySnapshotJson: freqSnapshot({
        frequencyCode: "Q6H",
        expansionStrategy: "INTERVAL_FROM_ANCHOR",
        intervalMinutes: 360,
        dosesPerDay: 4,
        category: "INTERVAL",
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const seqs = result.slots.map((s) => s.doseSequenceNumber);
    expect(seqs).toEqual(Array.from({ length: seqs.length }, (_, i) => i + 1));
  });

  it("filterUnmaterializedMedicationDoseSlots supports idempotent replan", () => {
    const result = planMedicationDoseExpansionSlots({
      anchorAt,
      horizonEndAt,
      facilityTimeZone: "UTC",
      frequencySnapshotJson: freqSnapshot({
        frequencyCode: "BID",
        expansionStrategy: "FIXED_DAILY_CLOCK",
        dosesPerDay: 2,
        category: "FIXED_DAILY",
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const existing = new Set([1, 2, 3]);
    const remaining = filterUnmaterializedMedicationDoseSlots(result.slots, existing);
    expect(remaining).toHaveLength(3);
    expect(remaining[0]!.doseSequenceNumber).toBe(4);
  });

  it("rejects unsupported expansion strategies", () => {
    const result = planMedicationDoseExpansionSlots({
      anchorAt,
      horizonEndAt,
      facilityTimeZone: "UTC",
      frequencySnapshotJson: freqSnapshot({
        frequencyCode: "PRN",
        expansionStrategy: "ON_DEMAND",
        category: "ON_DEMAND",
      }),
    });
    expect(result).toEqual({ ok: false, reason: "UNSUPPORTED_EXPANSION_STRATEGY" });
  });

  it("computes due windows for interval strategy", () => {
    const result = planMedicationDoseExpansionSlots({
      anchorAt,
      horizonEndAt: new Date(anchorAt.getTime() + 6 * 60 * 60 * 1000),
      facilityTimeZone: "UTC",
      frequencySnapshotJson: freqSnapshot({
        frequencyCode: "Q6H",
        expansionStrategy: "INTERVAL_FROM_ANCHOR",
        intervalMinutes: 360,
        dosesPerDay: 4,
        category: "INTERVAL",
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const slot = result.slots[0]!;
    expect(slot.dueWindowStartAt.toISOString()).toBe("2026-06-10T09:30:00.000Z");
    expect(slot.dueWindowEndAt.toISOString()).toBe("2026-06-10T11:00:00.000Z");
    expect(slot.overdueAt.toISOString()).toBe("2026-06-10T11:00:00.000Z");
  });

  it("uses platform fixed-daily clock defaults", () => {
    expect(MEDICATION_DOSE_FIXED_DAILY_CLOCK_SLOTS[2]).toEqual([
      { hour: 9, minute: 0 },
      { hour: 21, minute: 0 },
    ]);
  });

  it("wallClockToUtc maps UTC wall clock directly", () => {
    expect(wallClockToUtc(2026, 6, 10, 9, 0, "UTC").toISOString()).toBe(
      "2026-06-10T09:00:00.000Z"
    );
  });
});
