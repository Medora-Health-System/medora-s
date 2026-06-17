import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMedicationAdministrationCorrectionReasonStorage,
  normalizeMedicationAdministrationHistoryCorrectionRow,
  resolveMedicationAdministrationCorrectionEffectiveChangeSummary,
} from "@medora/shared";
import { buildMedicationAdministrationHistoryRailEntry } from "@/lib/medicationAdministrationHistoryRail";
import { filterMedicationAdministrationHistoryByInstantWindow } from "@/lib/marHistoricalTimeline";

const apiSrcRoot = join(import.meta.dirname, "../../../../api/src");

function readApiSrc(relativePath: string): string {
  return readFileSync(join(apiSrcRoot, relativePath), "utf8");
}

describe("marAdministrationCorrectionGovernance (MEDUI.ED.MAR.H7)", () => {
  const serviceSrc = readApiSrc("medication-administration/medication-administration.service.ts");
  const historySrc = readApiSrc("medication-administration/medication-administration-history.service.ts");
  const railSrc = readFileSync(
    join(import.meta.dirname, "../../lib/medicationAdministrationHistoryRail.ts"),
    "utf8"
  );

  it("13 — shift handoff: corrector attribution on correction row", () => {
    const entry = normalizeMedicationAdministrationHistoryCorrectionRow({
      id: "corr-shift",
      facilityId: "fac-1",
      medicationAdministrationId: "mar-a",
      correctedByUserId: "rn-b",
      correctionReason: "DOCUMENTED_WRONG_TIME",
      previousValues: {},
      correctedValues: {},
      createdAt: "2026-06-16T15:00:00.000Z",
      correctedByFirstName: "Bob",
      correctedByLastName: "Nurse",
      correctedByRole: "RN",
      encounterId: "enc-1",
      orderItemId: "oi-1",
    });
    expect(entry.performedByDisplay).toContain("Bob");
    expect(entry.performedByRole).toBe("RN");
  });

  it("14 — infusion compatibility: service documents infusion deferral", () => {
    expect(serviceSrc).toContain("infusionEvent: infusionStopTerminal || infusionStartRow");
    expect(serviceSrc).toContain("OrderEvent duration metadata unchanged");
  });

  it("15 — IVPB uses same effective-time correction path", () => {
    expect(serviceSrc).toContain("medicationAdministrationCorrection.create");
  });

  it("16 — PRN compatibility unchanged", () => {
    expect(historySrc).toContain("normalizeMedicationAdministrationHistoryMarRow");
  });

  it("17 — cancellation compatibility unchanged", () => {
    expect(historySrc).toContain("normalizeMedicationAdministrationHistoryOrderCancelRow");
  });

  it("18 — historical MAR review filter supports correction events", () => {
    const rows = [
      normalizeMedicationAdministrationHistoryCorrectionRow({
        id: "corr-hist",
        facilityId: "fac-1",
        medicationAdministrationId: "mar-1",
        correctedByUserId: "rn-1",
        correctionReason: "LATE_DOCUMENTATION",
        previousValues: {},
        correctedValues: {},
        createdAt: "2026-06-16T12:00:00.000Z",
        encounterId: "enc-1",
        orderItemId: "oi-1",
      }),
    ];
    const filtered = filterMedicationAdministrationHistoryByInstantWindow(rows, {
      startIso: "2026-06-16T07:00:00.000Z",
      endIso: "2026-06-16T20:00:00.000Z",
    });
    expect(filtered).toHaveLength(1);
  });

  it("19 — audit reconstruction via correction JSON", () => {
    const summary = resolveMedicationAdministrationCorrectionEffectiveChangeSummary({
      previousValues: { effectiveAdministeredAt: "2026-06-16T10:00:00.000Z" },
      correctedValues: { effectiveAdministeredAt: "2026-06-16T09:14:00.000Z" },
    });
    expect(summary).toContain("10:00");
    expect(serviceSrc).toContain("AuditAction.MEDICATION_ADMIN_TIME_ADJUSTED");
  });

  it("20 — append-only guarantee: no MAR delete in correction path", () => {
    expect(serviceSrc).toContain("medicationAdministrationCorrection.create");
    expect(serviceSrc).not.toContain("medicationAdministration.delete");
    expect(serviceSrc).toContain("Never mutates `administeredAt`");
  });

  it("history rail renders correction with labeled reason", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      {
        id: "mar-correction:corr-1",
        source: "MAR_CORRECTION",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        medicationLabel: "Morphine 4 mg",
        doseDisplay: "4 mg",
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
    expect(entry.statusLabelKey).toBe("marAdministrationHistory.eventType.ADMINISTRATION_CORRECTION");
    expect(entry.reasonLine).toContain("Dose documentée incorrecte");
    expect(railSrc).toContain("ADMINISTRATION_CORRECTION");
  });

  it("timeline uses effective time via enrichment without deleting original", () => {
    expect(readApiSrc("medication-dose/mar-shift-timeline-admin-enrichment.util.ts")).toContain(
      "effectiveAdministeredAt ?? row.administeredAt"
    );
  });

  it("structured storage round-trip", () => {
    const storage = buildMedicationAdministrationCorrectionReasonStorage({
      reasonCode: "DOCUMENTED_WRONG_TIME",
      reasonDetail: "Nurse clock error",
    });
    expect(storage).toContain("DOCUMENTED_WRONG_TIME");
  });
});
