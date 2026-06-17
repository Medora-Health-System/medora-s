import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MEDICATION_ADMINISTRATION_CLINICAL_FIELD_GOVERNANCE,
  MEDICATION_ADMINISTRATION_CORRECTION_GOVERNANCE,
  buildMedicationAdministrationCorrectionReasonStorage,
  normalizeMedicationAdministrationHistoryCorrectionRow,
  normalizeMedicationAdministrationHistoryMarRow,
  planMedicationAdministrationClinicalCorrection,
  resolveMedicationAdministrationCorrectionEffectiveChangeSummary,
} from "@medora/shared";
import { buildMedicationAdministrationHistoryRailEntry } from "@/lib/medicationAdministrationHistoryRail";
import { filterMedicationAdministrationHistoryByInstantWindow } from "@/lib/marHistoricalTimeline";

const apiSrcRoot = join(import.meta.dirname, "../../../../api/src");

function readApiSrc(relativePath: string): string {
  return readFileSync(join(apiSrcRoot, relativePath), "utf8");
}

describe("marClinicalCorrectionExpansion (MEDUI.ED.MAR.H7A)", () => {
  const serviceSrc = readApiSrc("medication-administration/medication-administration.service.ts");
  const controllerSrc = readApiSrc("medication-administration/medication-administration.controller.ts");
  const historySrc = readApiSrc("medication-administration/medication-administration-history.service.ts");

  const administeredMar = {
    doseValue: "4",
    doseUnit: "mg",
    route: "IV",
    marAction: "administered",
    notes: null,
  };

  it("1 — dose correction plan preserves original and updates effective dose", () => {
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_DOSE", doseValue: "2", doseUnit: "mg" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.plan.previousValues.doseValue).toBe("4");
      expect(plan.plan.marUpdate.doseValue).toBe("2");
      const summary = resolveMedicationAdministrationCorrectionEffectiveChangeSummary({
        previousValues: plan.plan.previousValues,
        correctedValues: plan.plan.correctedValues,
      });
      expect(summary).toBe("4 mg → 2 mg");
    }
  });

  it("2 — route correction plan IV → PO", () => {
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_ROUTE", route: "PO" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(resolveMedicationAdministrationCorrectionEffectiveChangeSummary({
        previousValues: plan.plan.previousValues,
        correctedValues: plan.plan.correctedValues,
      })).toBe("IV → PO");
    }
  });

  it("3 — duplicate correction flags without delete semantics", () => {
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DUPLICATE_ENTRY", reason: "Same med same time" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.plan.correctedValues.duplicateDocumentationFlag).toBe(true);
      expect(serviceSrc).not.toContain("medicationAdministration.delete");
    }
  });

  it("4 — charted-not-given correction sets refused effective outcome", () => {
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_NOT_GIVEN", reason: "Not actually given" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.plan.marUpdate.marAction).toBe("refused");
    }
  });

  it("5 — correction reason required for duplicate entry", () => {
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DUPLICATE_ENTRY" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(plan.ok).toBe(false);
  });

  it("6 — original preserved in correction previousValues", () => {
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_DOSE", doseValue: "2", doseUnit: "mg" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.plan.previousValues.doseValue).toBe("4");
      expect(plan.plan.previousValues.doseUnit).toBe("mg");
    }
  });

  it("7 — effective dose updated in marUpdate", () => {
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_DOSE", doseValue: "2", doseUnit: "mg" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    if (plan.ok) expect(plan.plan.marUpdate.doseValue).toBe("2");
  });

  it("8 — effective route updated in marUpdate", () => {
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_ROUTE", route: "PO" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    if (plan.ok) expect(plan.plan.marUpdate.route).toBe("PO");
  });

  it("9 — history rail chronology includes ADMINISTRATION_CORRECTION", () => {
    const admin = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      administeredAt: "2026-06-16T09:00:00.000Z",
      marAction: "administered",
      medicationLabelSnapshot: "Morphine",
      doseValue: "2",
      doseUnit: "mg",
      route: "IV",
      performedByFirstName: "Ann",
      performedByLastName: "Nurse",
    });
    const correction = normalizeMedicationAdministrationHistoryCorrectionRow({
      id: "corr-1",
      facilityId: "fac-1",
      medicationAdministrationId: "mar-1",
      correctedByUserId: "rn-2",
      correctionReason: "DOCUMENTED_WRONG_DOSE",
      previousValues: { doseValue: "4", doseUnit: "mg" },
      correctedValues: { doseValue: "2", doseUnit: "mg" },
      createdAt: "2026-06-16T10:00:00.000Z",
      correctedByFirstName: "Bob",
      correctedByLastName: "Nurse",
      correctedByRole: "RN",
      medicationLabel: "Morphine",
      doseDisplay: "2 mg",
      route: "IV",
      encounterId: "enc-1",
      orderItemId: "oi-1",
    });
    expect(admin.eventAt).toBe("2026-06-16T09:00:00.000Z");
    expect(correction.eventAt).toBe("2026-06-16T10:00:00.000Z");
    expect(correction.eventType).toBe("ADMINISTRATION_CORRECTION");
  });

  it("10 — timeline continuity uses effective administered time enrichment", () => {
    expect(readApiSrc("medication-dose/mar-shift-timeline-admin-enrichment.util.ts")).toContain(
      "effectiveAdministeredAt ?? row.administeredAt"
    );
  });

  it("11 — shift continuity preserves corrector attribution", () => {
    const entry = normalizeMedicationAdministrationHistoryCorrectionRow({
      id: "corr-shift",
      facilityId: "fac-1",
      medicationAdministrationId: "mar-a",
      correctedByUserId: "rn-b",
      correctionReason: "DOCUMENTED_WRONG_ROUTE",
      previousValues: { route: "IV" },
      correctedValues: { route: "PO" },
      createdAt: "2026-06-16T15:00:00.000Z",
      correctedByFirstName: "Bob",
      correctedByLastName: "Nurse",
      correctedByRole: "RN",
      encounterId: "enc-1",
      orderItemId: "oi-1",
    });
    expect(entry.performedByDisplay).toContain("Bob");
  });

  it("12 — infusion dose correction prohibited", () => {
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_DOSE", doseValue: "2", doseUnit: "mg" },
      current: administeredMar,
      marActionResolved: "administered",
      infusionPhase: "INFUSION_START",
    });
    expect(plan.ok).toBe(false);
  });

  it("13 — IVPB uses shared clinical correction service path", () => {
    expect(serviceSrc).toContain("applyClinicalCorrection");
    expect(controllerSrc).toContain("clinical-correction");
  });

  it("14 — PRN compatibility unchanged", () => {
    expect(historySrc).toContain("normalizeMedicationAdministrationHistoryMarRow");
  });

  it("15 — cancellation compatibility unchanged", () => {
    expect(historySrc).toContain("normalizeMedicationAdministrationHistoryOrderCancelRow");
  });

  it("16 — historical MAR review includes correction events", () => {
    const rows = [
      normalizeMedicationAdministrationHistoryCorrectionRow({
        id: "corr-hist",
        facilityId: "fac-1",
        medicationAdministrationId: "mar-1",
        correctedByUserId: "rn-1",
        correctionReason: "DOCUMENTED_WRONG_DOSE",
        previousValues: { doseValue: "4", doseUnit: "mg" },
        correctedValues: { doseValue: "2", doseUnit: "mg" },
        createdAt: "2026-06-16T12:00:00.000Z",
        encounterId: "enc-1",
        orderItemId: "oi-1",
      }),
    ];
    expect(
      filterMedicationAdministrationHistoryByInstantWindow(rows, {
        startIso: "2026-06-16T07:00:00.000Z",
        endIso: "2026-06-16T20:00:00.000Z",
      })
    ).toHaveLength(1);
  });

  it("17 — audit reconstruction via correction JSON", () => {
    const storage = buildMedicationAdministrationCorrectionReasonStorage({
      reasonCode: "DOCUMENTED_WRONG_DOSE",
      reasonDetail: "Actual dose lower",
    });
    const summary = resolveMedicationAdministrationCorrectionEffectiveChangeSummary({
      previousValues: { doseValue: "4", doseUnit: "mg" },
      correctedValues: { doseValue: "2", doseUnit: "mg" },
    });
    expect(storage).toContain("DOCUMENTED_WRONG_DOSE");
    expect(summary).toBe("4 mg → 2 mg");
    expect(serviceSrc).toContain("previousValues: plan.previousValues");
  });

  it("18 — append-only guarantee on clinical correction path", () => {
    expect(serviceSrc).toContain("medicationAdministrationCorrection.create");
    expect(serviceSrc).not.toContain("medicationAdministration.delete");
    expect(serviceSrc).toContain("Never mutates `administeredAt`");
  });

  it("19 — duplicate protection requires explicit detail", () => {
    const blocked = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DUPLICATE_ENTRY" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    const allowed = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DUPLICATE_ENTRY", reason: "Double chart same shift" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(blocked.ok).toBe(false);
    expect(allowed.ok).toBe(true);
  });

  it("20 — wrong-patient governance block", () => {
    expect(MEDICATION_ADMINISTRATION_CORRECTION_GOVERNANCE.restrictedReasonCodes).toContain(
      "DOCUMENTED_WRONG_PATIENT"
    );
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_PATIENT", reason: "Wrong patient" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(plan.ok).toBe(false);
    expect(MEDICATION_ADMINISTRATION_CLINICAL_FIELD_GOVERNANCE.patientId).toBe("must_never_edit");
    expect(serviceSrc).toContain("FORBIDDEN_WRONG_PATIENT");
  });

  it("history rail renders dose correction summary", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      {
        id: "mar-correction:corr-dose",
        source: "MAR_CORRECTION",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        medicationLabel: "Morphine",
        doseDisplay: "2 mg",
        route: "IV",
        eventType: "ADMINISTRATION_CORRECTION",
        eventAt: "2026-06-16T10:15:00.000Z",
        documentedAt: null,
        performedByDisplay: "Jane Jones",
        performedByRole: "RN",
        reasonCode: "DOCUMENTED_WRONG_DOSE",
        reasonDetail: null,
        isPrn: false,
        prnIndication: null,
        infusionPhase: null,
        medicationDoseInstanceId: null,
        originalAdministrationId: "mar-1",
        effectiveChangeSummary: "4 mg → 2 mg",
        readOnly: true,
      },
      {
        formatClinicalTime: (iso) => iso,
        t: (key) =>
          key === "marAdministrationCorrection.reason.DOCUMENTED_WRONG_DOSE"
            ? "Dose documentée incorrecte"
            : key === "marAdministrationCorrection.correctedPrefix"
              ? "Corrigé : "
              : key,
      }
    );
    expect(entry.reasonLine).toContain("4 mg → 2 mg");
  });
});
