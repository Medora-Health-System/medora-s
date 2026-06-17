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
      notes: notes.notes,
    });
    expect(projection?.responses).toHaveLength(1);

    const metrics = buildMarMedicationResponseAnalyticsMetrics({
      eligibleAdministrationCount: 4,
      projections: projection ? [projection] : [],
    });
    expect(metrics.responseDocumentedCount).toBe(1);
    expect(metrics.effectiveCount).toBe(1);
    expect(metrics.responseRate.numerator).toBe(1);
    expect(metrics.responseRate.denominator).toBe(4);
  });
});
