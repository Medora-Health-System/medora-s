import { describe, expect, it } from "vitest";
import {
  MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES,
  assessMarMedicationTimingOverrideRequirement,
  isMarMedicationTimingOverrideReasonCode,
  normalizeMarMedicationTimingOverrideReasonCode,
  resolveMarMedicationTimingOverrideReasonLabel,
  resolveMarMedicationTimingOverrideReasonLabelKey,
  validateMarMedicationTimingOverride,
} from "./marMedicationTimingOverrideGovernance.js";

describe("marMedicationTimingOverrideGovernance", () => {
  it("accepts all canonical reason codes", () => {
    for (const code of MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES) {
      expect(isMarMedicationTimingOverrideReasonCode(code)).toBe(true);
    }
  });

  it("maps legacy codes to canonical codes", () => {
    expect(normalizeMarMedicationTimingOverrideReasonCode("PROVIDER_INSTRUCTION")).toBe(
      "PROVIDER_REQUEST"
    );
    expect(normalizeMarMedicationTimingOverrideReasonCode("PROCEDURE_TIMING")).toBe(
      "PROCEDURE_SCHEDULE"
    );
    expect(normalizeMarMedicationTimingOverrideReasonCode("PATIENT_UNAVAILABLE")).toBe(
      "PATIENT_OFF_UNIT"
    );
  });

  it("rejects free-text-only overrides", () => {
    expect(
      validateMarMedicationTimingOverride({
        overrideKind: "EARLY_ADMINISTRATION",
        movedMinutes: 45,
        reasonCode: "because patient asked",
      }).ok
    ).toBe(false);
    expect(
      validateMarMedicationTimingOverride({
        overrideKind: "EARLY_ADMINISTRATION",
        movedMinutes: 45,
        reasonCode: null,
      }).ok
    ).toBe(false);
  });

  it("does not require reason for on-time administration within 30 minutes", () => {
    const requirement = assessMarMedicationTimingOverrideRequirement({
      overrideKind: "ON_TIME_ADMINISTRATION",
      movedMinutes: 20,
    });
    expect(requirement.reasonRequired).toBe(false);
    expect(
      validateMarMedicationTimingOverride({
        overrideKind: "ON_TIME_ADMINISTRATION",
        movedMinutes: 20,
      }).ok
    ).toBe(true);
  });

  it("requires reason for early administration beyond 30 minutes", () => {
    const requirement = assessMarMedicationTimingOverrideRequirement({
      overrideKind: "EARLY_ADMINISTRATION",
      movedMinutes: 45,
    });
    expect(requirement.reasonRequired).toBe(true);
    expect(
      validateMarMedicationTimingOverride({
        overrideKind: "EARLY_ADMINISTRATION",
        movedMinutes: 45,
        reasonCode: "CLINICAL_CONDITION",
      }).ok
    ).toBe(true);
  });

  it("requires reason for late administration beyond 30 minutes", () => {
    expect(
      validateMarMedicationTimingOverride({
        overrideKind: "LATE_ADMINISTRATION",
        movedMinutes: 90,
        reasonCode: "PATIENT_OFF_UNIT",
      }).ok
    ).toBe(true);
  });

  it("always requires reason for schedule change", () => {
    expect(
      assessMarMedicationTimingOverrideRequirement({
        overrideKind: "SCHEDULE_CHANGE",
        movedMinutes: 10,
      }).reasonRequired
    ).toBe(true);
    expect(
      validateMarMedicationTimingOverride({
        overrideKind: "SCHEDULE_CHANGE",
        movedMinutes: 10,
        reasonCode: "PROCEDURE_SCHEDULE",
      }).ok
    ).toBe(true);
  });

  it("flags high-risk overrides over 120 minutes", () => {
    const requirement = assessMarMedicationTimingOverrideRequirement({
      overrideKind: "LATE_ADMINISTRATION",
      movedMinutes: 150,
    });
    expect(requirement.severity).toBe("HIGH");
    expect(requirement.reviewRecommended).toBe(true);
    expect(requirement.detailRequired).toBe(true);
    expect(
      validateMarMedicationTimingOverride({
        overrideKind: "LATE_ADMINISTRATION",
        movedMinutes: 150,
        reasonCode: "PATIENT_OFF_UNIT",
      }).ok
    ).toBe(false);
    expect(
      validateMarMedicationTimingOverride({
        overrideKind: "LATE_ADMINISTRATION",
        movedMinutes: 150,
        reasonCode: "PATIENT_OFF_UNIT",
        reasonDetail: "Patient in imaging suite",
      }).ok
    ).toBe(true);
  });

  it("requires detail for OTHER reason code", () => {
    expect(
      validateMarMedicationTimingOverride({
        overrideKind: "EARLY_ADMINISTRATION",
        movedMinutes: 60,
        reasonCode: "OTHER",
      }).ok
    ).toBe(false);
    expect(
      validateMarMedicationTimingOverride({
        overrideKind: "EARLY_ADMINISTRATION",
        movedMinutes: 60,
        reasonCode: "OTHER",
        reasonDetail: "Unit staffing constraint",
      }).ok
    ).toBe(true);
  });

  it("resolves i18n label keys and locale labels", () => {
    expect(resolveMarMedicationTimingOverrideReasonLabelKey("CLINICAL_CONDITION")).toBe(
      "marTimingOverride.reason.CLINICAL_CONDITION"
    );
    expect(resolveMarMedicationTimingOverrideReasonLabel("PROCEDURE_SCHEDULE", "en")).toBe(
      "Procedure schedule"
    );
    expect(resolveMarMedicationTimingOverrideReasonLabel("PROCEDURE_TIMING", "fr")).toBe(
      "Horaire de procédure"
    );
  });
});
