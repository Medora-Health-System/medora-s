import { describe, expect, it } from "vitest";
import {
  buildMarMedicationResponseNotes,
  formatMarMedicationResponseChronologyLabels,
  parseMarMedicationResponseNotes,
  sortMarMedicationResponsesNewestFirst,
} from "@medora/shared";

describe("marMedicationResponseChronology", () => {
  it("preserves multiple responses and orders newest-first", () => {
    let notes: string | null = null;
    const payloads = [
      {
        responseCode: "PAIN_REDUCED" as const,
        responseTime: "2026-06-03T09:30:00.000Z",
        documentedAt: "2026-06-03T09:30:00.000Z",
      },
      {
        responseCode: "PAIN_UNCHANGED" as const,
        responseTime: "2026-06-03T10:30:00.000Z",
        documentedAt: "2026-06-03T10:30:00.000Z",
      },
      {
        responseCode: "EFFECTIVE" as const,
        responseTime: "2026-06-03T11:30:00.000Z",
        documentedAt: "2026-06-03T11:30:00.000Z",
      },
    ];
    for (const payload of payloads) {
      const built = buildMarMedicationResponseNotes(notes, payload);
      expect(built.ok).toBe(true);
      if (!built.ok) return;
      notes = built.notes;
    }

    const parsed = parseMarMedicationResponseNotes(notes);
    expect(parsed).toHaveLength(3);
    expect(formatMarMedicationResponseChronologyLabels(parsed)).toEqual([
      "EFFECTIVE",
      "PAIN_UNCHANGED",
      "PAIN_REDUCED",
    ]);
    expect(sortMarMedicationResponsesNewestFirst(parsed)[0]?.responseCode).toBe("EFFECTIVE");
  });
});
