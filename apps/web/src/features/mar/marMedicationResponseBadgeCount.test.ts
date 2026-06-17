import { describe, expect, it } from "vitest";
import { buildMarMedicationResponseTimelineBadge } from "@medora/shared";
import { buildMarMedicationResponseNotes } from "@medora/shared";

describe("marMedicationResponseBadgeCount", () => {
  it("badge shows RESPONSE for one", () => {
    const built = buildMarMedicationResponseNotes(null, {
      responseCode: "EFFECTIVE",
      documentedAt: "2026-06-03T10:00:00.000Z",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const badge = buildMarMedicationResponseTimelineBadge(built.notes);
    expect(badge?.displayLabel).toBe("RESPONSE");
    expect(badge?.count).toBe(1);
  });

  it("badge shows RESPONSE (3) for three", () => {
    let notes: string | null = null;
    for (const documentedAt of [
      "2026-06-03T09:30:00.000Z",
      "2026-06-03T10:30:00.000Z",
      "2026-06-03T11:30:00.000Z",
    ]) {
      const built = buildMarMedicationResponseNotes(notes, {
        responseCode: "EFFECTIVE",
        documentedAt,
      });
      if (!built.ok) throw new Error("build failed");
      notes = built.notes;
    }
    const badge = buildMarMedicationResponseTimelineBadge(notes);
    expect(badge?.displayLabel).toBe("RESPONSE (3)");
    expect(badge?.count).toBe(3);
  });

  it("badge severity uses highest-severity response", () => {
    let notes: string | null = null;
    for (const payload of [
      { responseCode: "EFFECTIVE" as const, documentedAt: "2026-06-03T09:30:00.000Z" },
      { responseCode: "NO_ADVERSE_REACTION" as const, documentedAt: "2026-06-03T10:00:00.000Z" },
      {
        responseCode: "ADVERSE_REACTION_REPORTED" as const,
        responseDetail: "rash",
        documentedAt: "2026-06-03T10:30:00.000Z",
      },
    ]) {
      const built = buildMarMedicationResponseNotes(notes, payload);
      if (!built.ok) throw new Error("build failed");
      notes = built.notes;
    }
    const badge = buildMarMedicationResponseTimelineBadge(notes);
    expect(badge?.severity).toBe("safety");
    expect(badge?.displayLabel).toBe("RESPONSE (3)");
  });
});
