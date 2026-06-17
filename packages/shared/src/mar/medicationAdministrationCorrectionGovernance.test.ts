import { describe, expect, it } from "vitest";
import {
  buildMedicationAdministrationCorrectionReasonStorage,
  buildMedicationAdministrationHistoryCorrectionId,
  inferMedicationAdministrationCorrectionReasonCodeForEffectiveTime,
  parseMedicationAdministrationCorrectionReasonFields,
  resolveMedicationAdministrationCorrectionEffectiveChangeSummary,
} from "./medicationAdministrationCorrectionGovernance.js";
import { normalizeMedicationAdministrationHistoryCorrectionRow } from "./medicationAdministrationHistoryNormalization.js";

describe("medicationAdministrationCorrectionGovernance (MEDUI.ED.MAR.H7)", () => {
  it("1 — wrong-time correction reason inferred", () => {
    const code = inferMedicationAdministrationCorrectionReasonCodeForEffectiveTime({
      previousEffectiveAdministeredAt: null,
      newEffectiveAdministeredAt: new Date("2026-06-16T09:00:00.000Z"),
      originalAdministeredAt: new Date("2026-06-16T10:00:00.000Z"),
      systemDocumentedAt: new Date("2026-06-16T10:05:00.000Z"),
    });
    expect(code).toBe("DOCUMENTED_WRONG_TIME");
  });

  it("2 — wrong-dose code available for future dose corrections", () => {
    const summary = resolveMedicationAdministrationCorrectionEffectiveChangeSummary({
      previousValues: { doseValue: "4", doseUnit: "mg" },
      correctedValues: { doseValue: "2", doseUnit: "mg" },
    });
    expect(summary).toBe("4 mg → 2 mg");
  });

  it("3 — wrong-route summary", () => {
    const summary = resolveMedicationAdministrationCorrectionEffectiveChangeSummary({
      previousValues: { route: "PO" },
      correctedValues: { route: "IV" },
    });
    expect(summary).toBe("PO → IV");
  });

  it("4 — late documentation inferred for large backdate", () => {
    const code = inferMedicationAdministrationCorrectionReasonCodeForEffectiveTime({
      previousEffectiveAdministeredAt: null,
      newEffectiveAdministeredAt: new Date("2026-06-14T08:00:00.000Z"),
      originalAdministeredAt: new Date("2026-06-16T10:00:00.000Z"),
      systemDocumentedAt: new Date("2026-06-16T10:00:00.000Z"),
    });
    expect(code).toBe("LATE_DOCUMENTATION");
  });

  it("5 — duplicate documentation code exists", () => {
    const storage = buildMedicationAdministrationCorrectionReasonStorage({
      reasonCode: "DUPLICATE_ENTRY",
    });
    expect(parseMedicationAdministrationCorrectionReasonFields(storage).reasonCode).toBe(
      "DUPLICATE_ENTRY"
    );
  });

  it("6 — charted-not-given code parseable", () => {
    const storage = buildMedicationAdministrationCorrectionReasonStorage({
      reasonCode: "DOCUMENTED_NOT_GIVEN",
      reasonDetail: "Patient refused after charting",
    });
    const parsed = parseMedicationAdministrationCorrectionReasonFields(storage);
    expect(parsed.reasonCode).toBe("DOCUMENTED_NOT_GIVEN");
    expect(parsed.reasonDetail).toContain("refused");
  });

  it("7 — structured correction reason storage", () => {
    const storage = buildMedicationAdministrationCorrectionReasonStorage({
      reasonCode: "DOCUMENTED_WRONG_TIME",
      reasonDetail: "Clock error",
    });
    expect(storage).toBe("DOCUMENTED_WRONG_TIME — Clock error");
  });

  it("8 — correction history entry preserves original administration id", () => {
    const entry = normalizeMedicationAdministrationHistoryCorrectionRow({
      id: "corr-1",
      facilityId: "fac-1",
      medicationAdministrationId: "mar-1",
      correctedByUserId: "rn-2",
      correctionReason: "DOCUMENTED_WRONG_TIME — bedside timing",
      previousValues: { effectiveAdministeredAt: "2026-06-16T10:00:00.000Z" },
      correctedValues: { effectiveAdministeredAt: "2026-06-16T09:00:00.000Z" },
      createdAt: "2026-06-16T10:15:00.000Z",
      correctedByFirstName: "Jane",
      correctedByLastName: "Jones",
      correctedByRole: "RN",
      medicationLabel: "Morphine 4 mg",
      doseDisplay: "4 mg",
      route: "IV",
      encounterId: "enc-1",
      orderItemId: "oi-1",
    });
    expect(entry.eventType).toBe("ADMINISTRATION_CORRECTION");
    expect(entry.originalAdministrationId).toBe("mar-1");
    expect(entry.id).toBe(buildMedicationAdministrationHistoryCorrectionId("corr-1"));
  });

  it("9 — original MAR row id not replaced by correction id", () => {
    expect(buildMedicationAdministrationHistoryCorrectionId("corr-1")).not.toBe("mar-1");
  });

  it("10 — effective view time summary on correction row", () => {
    const entry = normalizeMedicationAdministrationHistoryCorrectionRow({
      id: "corr-2",
      facilityId: "fac-1",
      medicationAdministrationId: "mar-2",
      correctedByUserId: "rn-2",
      correctionReason: "DOCUMENTED_WRONG_TIME",
      previousValues: { effectiveAdministeredAt: "2026-06-16T10:00:00.000Z" },
      correctedValues: { effectiveAdministeredAt: "2026-06-16T09:00:00.000Z" },
      createdAt: "2026-06-16T10:15:00.000Z",
      encounterId: "enc-1",
      orderItemId: "oi-1",
    });
    expect(entry.effectiveChangeSummary).toContain("→");
  });

  it("11 — append-only correction id prefix", () => {
    expect(buildMedicationAdministrationHistoryCorrectionId("x")).toContain("mar-correction:");
  });

  it("12 — explicit correction reason code honored", () => {
    const code = inferMedicationAdministrationCorrectionReasonCodeForEffectiveTime({
      previousEffectiveAdministeredAt: null,
      newEffectiveAdministeredAt: new Date("2026-06-16T09:00:00.000Z"),
      originalAdministeredAt: new Date("2026-06-16T10:00:00.000Z"),
      systemDocumentedAt: new Date("2026-06-16T10:00:00.000Z"),
      explicitCode: "USER_ERROR",
    });
    expect(code).toBe("USER_ERROR");
  });
});
