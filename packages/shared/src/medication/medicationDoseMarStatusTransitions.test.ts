import { describe, expect, it } from "vitest";
import {
  assertDoseStatusAfterTerminalMar,
  MedicationDoseMarStatusTransitionError,
  resolveDoseStatusAfterTerminalMar,
} from "./medicationDoseMarStatusTransitions.js";

describe("medicationDoseMarStatusTransitions (M1.8B.7I.1)", () => {
  it.each(["administered", "refused", "not_available", "md_changed"] as const)(
    "terminal MAR %s → COMPLETED",
    (marAction) => {
      expect(
        resolveDoseStatusAfterTerminalMar({ marAction, currentDoseStatus: "DUE" })
      ).toEqual({ ok: true, nextStatus: "COMPLETED" });
    }
  );

  it("rejects terminal dose statuses", () => {
    expect(
      resolveDoseStatusAfterTerminalMar({ marAction: "administered", currentDoseStatus: "COMPLETED" })
    ).toMatchObject({ ok: false, code: "DOSE_ALREADY_TERMINAL" });
    expect(
      resolveDoseStatusAfterTerminalMar({ marAction: "administered", currentDoseStatus: "MISSED" })
    ).toMatchObject({ ok: false, code: "DOSE_ALREADY_TERMINAL" });
  });

  it("rejects HELD dose", () => {
    expect(
      resolveDoseStatusAfterTerminalMar({ marAction: "administered", currentDoseStatus: "HELD" })
    ).toMatchObject({ ok: false, code: "DOSE_STATUS_HELD" });
  });

  it("rejects unsupported MAR action", () => {
    expect(
      resolveDoseStatusAfterTerminalMar({ marAction: "unknown", currentDoseStatus: "DUE" })
    ).toMatchObject({ ok: false, code: "UNSUPPORTED_MAR_ACTION" });
  });

  it("assertDoseStatusAfterTerminalMar returns COMPLETED", () => {
    expect(
      assertDoseStatusAfterTerminalMar({ marAction: "administered", currentDoseStatus: "OVERDUE" })
    ).toBe("COMPLETED");
  });

  it("assert throws MedicationDoseMarStatusTransitionError", () => {
    expect(() =>
      assertDoseStatusAfterTerminalMar({ marAction: "administered", currentDoseStatus: "COMPLETED" })
    ).toThrow(MedicationDoseMarStatusTransitionError);
  });
});
