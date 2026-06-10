import { describe, expect, it } from "vitest";
import {
  MEDICATION_DOSE_STATUSES,
  isActiveMedicationDoseStatus,
  isQueueVisibleMedicationDoseStatus,
  isTerminalMedicationDoseStatus,
} from "./medicationDoseStatus.js";

describe("medicationDoseStatus (M1.8B.7F.1)", () => {
  it("exposes stable status vocabulary", () => {
    expect(MEDICATION_DOSE_STATUSES).toHaveLength(9);
    expect(MEDICATION_DOSE_STATUSES).toContain("PLANNED");
    expect(MEDICATION_DOSE_STATUSES).toContain("SUPERSEDED");
  });

  it("terminal helper returns true for COMPLETED, MISSED, CANCELLED, SUPERSEDED", () => {
    for (const status of ["COMPLETED", "MISSED", "CANCELLED", "SUPERSEDED"] as const) {
      expect(isTerminalMedicationDoseStatus(status)).toBe(true);
      expect(isActiveMedicationDoseStatus(status)).toBe(false);
    }
  });

  it("queue-visible helper returns true for DUE, OVERDUE, IN_PROGRESS, HELD", () => {
    for (const status of ["DUE", "OVERDUE", "IN_PROGRESS", "HELD"] as const) {
      expect(isQueueVisibleMedicationDoseStatus(status)).toBe(true);
    }
  });

  it("PLANNED is not terminal", () => {
    expect(isTerminalMedicationDoseStatus("PLANNED")).toBe(false);
    expect(isActiveMedicationDoseStatus("PLANNED")).toBe(true);
  });

  it("PLANNED is not queue-visible (maps to UPCOMING bucket separately)", () => {
    expect(isQueueVisibleMedicationDoseStatus("PLANNED")).toBe(false);
  });
});
