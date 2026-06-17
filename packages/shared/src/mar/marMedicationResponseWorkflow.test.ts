import { describe, expect, it } from "vitest";
import {
  buildMarMedicationResponseNotes,
  parseMarMedicationResponseNotes,
} from "./marMedicationResponseGovernance.js";

describe("marMedicationResponseWorkflow", () => {
  it("preserves multiple append-only responses", () => {
    let notes: string | null = null;
    for (const payload of [
      { responseCode: "EFFECTIVE" as const, documentedAt: "2026-06-03T10:00:00.000Z" },
      {
        responseCode: "ADVERSE_REACTION_REPORTED" as const,
        responseDetail: "rash",
        documentedAt: "2026-06-03T10:15:00.000Z",
      },
    ]) {
      const built = buildMarMedicationResponseNotes(notes, payload);
      expect(built.ok).toBe(true);
      if (!built.ok) return;
      notes = built.notes;
    }
    const parsed = parseMarMedicationResponseNotes(notes);
    expect(parsed).toHaveLength(2);
    expect(parsed[1]?.responseCode).toBe("ADVERSE_REACTION_REPORTED");
    expect(parsed[1]?.responseDetail).toBe("rash");
  });
});
