import { describe, expect, it } from "vitest";
import {
  buildMedicationGovernanceChartSummary,
  buildMedicationGovernanceTimelineEvents,
} from "./medicationGovernanceChartSummary.js";

describe("medicationGovernanceChartSummary", () => {
  it("builds controlled + witness + waste summary", () => {
    const summary = buildMedicationGovernanceChartSummary({
      medicationAdministrationId: "mar-1",
      orderItemId: "oi-1",
      administeredAtIso: "2026-05-28T12:00:00.000Z",
      medicationLabel: "Morphine 4 mg IV",
      doseValue: "4",
      doseUnit: "mg",
      route: "IV",
      artifacts: {
        verifications: [
          { verificationType: "WITNESS", verificationStatus: "COMPLETED", createdAtIso: "2026-05-28T12:00:00.000Z" },
        ],
        waste: [{ status: "COMPLETED", witnessUserId: "u2", createdAtIso: "2026-05-28T12:01:00.000Z" }],
        overrides: [],
        pharmacy: null,
      },
    });
    expect(summary.lines.map((l) => l.key)).toEqual(
      expect.arrayContaining(["controlled_substance", "witness_completed", "waste_documented", "waste_witnessed"])
    );
    expect(summary.hasOverride).toBe(false);
    expect(summary.doseDisplay).toBe("4 mg");
  });

  it("builds high-alert + pharmacy verified summary", () => {
    const summary = buildMedicationGovernanceChartSummary({
      medicationAdministrationId: "mar-2",
      orderItemId: "oi-2",
      administeredAtIso: "2026-05-28T13:00:00.000Z",
      medicationLabel: "Heparin",
      doseValue: null,
      doseUnit: null,
      route: "IV",
      artifacts: {
        verifications: [
          {
            verificationType: "INDEPENDENT_DOUBLE_CHECK",
            verificationStatus: "COMPLETED",
            createdAtIso: "2026-05-28T13:00:00.000Z",
          },
        ],
        waste: [],
        overrides: [],
        pharmacy: { verificationStatus: "VERIFIED", updatedAtIso: "2026-05-28T12:30:00.000Z" },
      },
    });
    expect(summary.lines.map((l) => l.key)).toEqual(
      expect.arrayContaining(["high_alert", "double_check_completed", "pharmacy_verified"])
    );
  });

  it("includes override lines", () => {
    const summary = buildMedicationGovernanceChartSummary({
      medicationAdministrationId: "mar-3",
      orderItemId: null,
      administeredAtIso: "2026-05-28T14:00:00.000Z",
      medicationLabel: "Hydromorphone",
      doseValue: "2",
      doseUnit: "mg",
      route: "PO",
      artifacts: {
        verifications: [
          { verificationType: "LASA_ACKNOWLEDGMENT", verificationStatus: "COMPLETED", createdAtIso: "2026-05-28T14:00:00.000Z" },
        ],
        waste: [],
        overrides: [{ overrideType: "LASA_OVERRIDE", createdAtIso: "2026-05-28T14:00:00.000Z" }],
        pharmacy: null,
      },
    });
    expect(summary.hasOverride).toBe(true);
    expect(summary.lines.some((l) => l.key === "lasa_acknowledged")).toBe(true);
    expect(summary.lines.some((l) => l.key === "lasa_override")).toBe(true);
  });

  it("emits concise timeline events", () => {
    const events = buildMedicationGovernanceTimelineEvents({
      medicationAdministrationId: "mar-1",
      orderItemId: "oi-1",
      medicationLabel: "Morphine",
      artifacts: {
        verifications: [
          { verificationType: "WITNESS", verificationStatus: "COMPLETED", createdAtIso: "2026-05-28T12:00:00.000Z" },
        ],
        waste: [],
        overrides: [],
        pharmacy: { verificationStatus: "VERIFIED", updatedAtIso: "2026-05-28T11:00:00.000Z" },
      },
    });
    expect(events.map((e) => e.eventKind)).toEqual(
      expect.arrayContaining(["PHARMACY_VERIFIED", "MAR_WITNESS_COMPLETED"])
    );
  });
});
