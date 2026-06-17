import { describe, expect, it } from "vitest";
import {
  buildMarMedicationResponseAnalyticsMetrics,
  buildMarMedicationResponseAnalyticsProjection,
} from "./marMedicationResponseAnalytics.js";
import { buildMarMedicationResponseNotes } from "./marMedicationResponseGovernance.js";

describe("marMedicationResponseAnalytics", () => {
  it("projects response analytics", () => {
    const notes = buildMarMedicationResponseNotes(null, {
      responseCode: "EFFECTIVE",
      documentedAt: "2026-06-03T10:00:00.000Z",
    });
    expect(notes.ok).toBe(true);
    if (!notes.ok) return;

    const projection = buildMarMedicationResponseAnalyticsProjection({
      administrationId: "mar-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      eventAt: "2026-06-03T09:45:00.000Z",
      administeredAt: "2026-06-03T09:00:00.000Z",
      medicationLabel: "Morphine 2 mg IV",
      route: "IV",
      frequencyCode: "PRN",
      notes: notes.notes,
    });
    expect(projection?.responses).toHaveLength(1);

    const metrics = buildMarMedicationResponseAnalyticsMetrics({
      eligibleAdministrationCount: 4,
      projections: projection ? [projection] : [],
      followUpCandidates: [
        {
          administrationId: "mar-2",
          administeredAt: "2026-06-03T09:00:00.000Z",
          medicationLabel: "Morphine 2 mg IV",
          route: "IV",
          frequencyCode: "PRN",
          doseStatus: "COMPLETED",
        },
      ],
      referenceAt: "2026-06-03T09:30:00.000Z",
    });
    expect(metrics.responseDocumentedCount).toBe(1);
    expect(metrics.effectiveCount).toBe(1);
    expect(metrics.responseRecommendedCount).toBe(1);
  });

  it("counts adverse escalation and multiple responses", () => {
    let notes: string | null = null;
    for (const payload of [
      { responseCode: "EFFECTIVE" as const, documentedAt: "2026-06-03T09:30:00.000Z" },
      {
        responseCode: "ADVERSE_REACTION_REPORTED" as const,
        responseDetail: "rash",
        documentedAt: "2026-06-03T10:00:00.000Z",
      },
    ]) {
      const built = buildMarMedicationResponseNotes(notes, payload);
      if (!built.ok) throw new Error("build failed");
      notes = built.notes;
    }
    const projection = buildMarMedicationResponseAnalyticsProjection({
      administrationId: "mar-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      eventAt: "2026-06-03T09:00:00.000Z",
      administeredAt: "2026-06-03T09:00:00.000Z",
      medicationLabel: "Morphine 2 mg IV",
      route: "IV",
      frequencyCode: "PRN",
      notes,
    });
    const metrics = buildMarMedicationResponseAnalyticsMetrics({
      eligibleAdministrationCount: 1,
      projections: projection ? [projection] : [],
      followUpCandidates: [],
      referenceAt: "2026-06-03T11:00:00.000Z",
    });
    expect(metrics.adverseReactionEscalationCount).toBe(1);
    expect(metrics.multipleResponseCount).toBe(1);
    expect(metrics.adverseReactionCount).toBe(1);
  });
});
