import { describe, expect, it } from "vitest";
import { observationMarWorkflowChipModel } from "./observationMarWorkflowChipModel";

describe("observationMarWorkflowChipModel", () => {
  it("prefers overdue over other signals", () => {
    const m = observationMarWorkflowChipModel(
      { pendingMedicationLines: 3, overdueMedicationLines: 1, activeInfusionSessions: 2 },
      false
    );
    expect(m.tone).toBe("alert");
    expect(m.labelKey).toContain("overdue");
    expect(m.count).toBe(1);
  });

  it("shows infusion when no overdue", () => {
    const m = observationMarWorkflowChipModel(
      { pendingMedicationLines: 2, overdueMedicationLines: 0, activeInfusionSessions: 1 },
      false
    );
    expect(m.tone).toBe("caution");
    expect(m.labelKey).toContain("infusionActive");
  });

  it("shows active lines when no infusion", () => {
    const m = observationMarWorkflowChipModel(
      { pendingMedicationLines: 2, overdueMedicationLines: 0, activeInfusionSessions: 0 },
      false
    );
    expect(m.tone).toBe("caution");
    expect(m.labelKey).toContain("activeLines");
  });

  it("clear when nothing pending", () => {
    const m = observationMarWorkflowChipModel(
      { pendingMedicationLines: 0, overdueMedicationLines: 0, activeInfusionSessions: 0 },
      false
    );
    expect(m.tone).toBe("ok");
  });

  it("loading state", () => {
    expect(observationMarWorkflowChipModel(null, true).tone).toBe("loading");
  });
});
