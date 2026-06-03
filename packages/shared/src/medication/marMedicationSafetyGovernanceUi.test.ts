import { describe, expect, it } from "vitest";
import {
  formatControlledSchedule,
  formatHighAlertClass,
  formatLasaSeverity,
  getMedicationSafetyBadges,
  getMedicationSafetyWarningSummary,
  medicationSafetyGovernanceHasDisplay,
  parseMedicationHighAlertCategoriesJson,
} from "./marMedicationSafetyGovernanceUi.js";

describe("marMedicationSafetyGovernanceUi (M1.3F.3)", () => {
  it("parses highAlertCategories JSON for HA and LASA", () => {
    expect(
      parseMedicationHighAlertCategoriesJson({
        highAlertClass: "HIGH_ALERT_OPIOID",
        lasa: {
          lasaGroupCode: "GROUP_LASA_OPIOID",
          lasaGroupLabel: "Morphine / hydromorphone",
          lasaSeverity: "LASA_HIGH",
        },
      })
    ).toEqual({
      highAlertClass: "HIGH_ALERT_OPIOID",
      lasaGroupCode: "GROUP_LASA_OPIOID",
      lasaGroupLabel: "Morphine / hydromorphone",
      lasaSeverity: "LASA_HIGH",
    });
  });

  it("formats schedule, HA class, and LASA severity for display", () => {
    expect(formatControlledSchedule("II")).toBe("Schedule II");
    expect(formatHighAlertClass("HIGH_ALERT_INSULIN")).toBe("INSULIN");
    expect(formatLasaSeverity("LASA_HIGH")).toBe("HIGH");
  });

  it("returns warning badges without MAR blocking flags for opioid (M1.7A.9)", () => {
    const badges = getMedicationSafetyBadges({
      isControlled: true,
      isHighAlert: true,
      highAlertClass: "HIGH_ALERT_OPIOID",
      lasaGroupId: "GROUP_LASA_OPIOID",
      requiresWitness: true,
      requiresDoubleSign: true,
      wasteDocumentationRecommended: true,
      pharmacyVerificationStatus: "PENDING",
      requiresPharmacyVerification: true,
    });
    expect(badges).toEqual([
      "CONTROLLED",
      "HIGH_ALERT",
      "LASA",
      "WITNESS_REQUIRED",
      "WASTE_REQUIRED",
    ]);
  });

  it("shows double-check badge for insulin (M1.7A.9 allowlist)", () => {
    expect(
      getMedicationSafetyBadges({
        isHighAlert: true,
        highAlertClass: "HIGH_ALERT_INSULIN",
        requiresDoubleSign: true,
      })
    ).toContain("DOUBLE_SIGN_REQUIRED");
  });

  it("returns no badges for non-governed medication", () => {
    const input = { isControlled: false, isHighAlert: false };
    expect(getMedicationSafetyBadges(input)).toEqual([]);
    expect(medicationSafetyGovernanceHasDisplay(input)).toBe(false);
    expect(getMedicationSafetyWarningSummary(input)).toEqual([]);
  });

  it("uses highRiskNameMatch only as HA fallback without other flags", () => {
    expect(getMedicationSafetyBadges({ highRiskNameMatch: true })).toEqual(["HIGH_ALERT"]);
  });

  it("does not imply hard-stop enforcement in summary output", () => {
    const summary = getMedicationSafetyWarningSummary({
      isControlled: true,
      controlledSchedule: "II",
      requiresWitness: true,
    });
    expect(summary.some((l) => l.kind === "informational")).toBe(true);
    expect(summary.find((l) => l.kind === "witness_required")).toBeDefined();
  });
});
