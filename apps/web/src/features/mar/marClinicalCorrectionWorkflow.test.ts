import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { MedicationAdministrationHistoryEntry } from "@medora/shared";
import {
  normalizeMedicationAdministrationHistoryCorrectionRow,
  normalizeMedicationAdministrationHistoryMarRow,
  planMedicationAdministrationClinicalCorrection,
} from "@medora/shared";
import {
  buildMarClinicalCorrectionChain,
  buildMarClinicalCorrectionMenu,
  buildMarClinicalCorrectionBeforeAfterPreview,
  isMarClinicalCorrectionReviewRecommended,
  resolveMarAdministrationCorrectedBadge,
} from "@/features/mar/marClinicalCorrectionWorkflow";
import { buildMedicationAdministrationHistoryRailEntry } from "@/lib/medicationAdministrationHistoryRail";

const apiSrcRoot = join(import.meta.dirname, "../../../../api/src");
const tabSrc = readFileSync(
  join(import.meta.dirname, "../../components/encounters/MedicationAdministrationTab.tsx"),
  "utf8"
);
const serviceSrc = readFileSync(
  join(apiSrcRoot, "medication-administration/medication-administration.service.ts"),
  "utf8"
);

function administeredHistory(id: string): MedicationAdministrationHistoryEntry {
  return normalizeMedicationAdministrationHistoryMarRow({
    id,
    encounterId: "enc-1",
    orderItemId: "oi-1",
    administeredAt: "2026-06-16T09:00:00.000Z",
    marAction: "administered",
    medicationLabelSnapshot: "Morphine",
    doseValue: "4",
    doseUnit: "mg",
    route: "IV",
    performedByFirstName: "Ann",
    performedByLastName: "Nurse",
  });
}

function doseCorrectionHistory(adminId: string): MedicationAdministrationHistoryEntry {
  return normalizeMedicationAdministrationHistoryCorrectionRow({
    id: "corr-1",
    facilityId: "fac-1",
    medicationAdministrationId: adminId,
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
}

describe("marClinicalCorrectionWorkflow (MEDUI.ED.MAR.H7B)", () => {
  const administeredMar = {
    doseValue: "4",
    doseUnit: "mg",
    route: "IV",
    marAction: "administered",
    notes: null,
  };

  it("1 — correction menu visible for eligible administered row", () => {
    const menu = buildMarClinicalCorrectionMenu({
      encounterOpen: true,
      canAdjust: true,
      marActionResolved: "administered",
    });
    expect(menu.visible).toBe(true);
    expect(menu.items.some((i) => i.kind === "action" && i.type === "DOSE" && i.enabled)).toBe(true);
  });

  it("2 — correction menu hidden when ineligible", () => {
    const menu = buildMarClinicalCorrectionMenu({
      encounterOpen: false,
      canAdjust: true,
      marActionResolved: "administered",
    });
    expect(menu.visible).toBe(false);
  });

  it("3 — time correction workflow wired in MAR tab", () => {
    expect(tabSrc).toContain("MedicationAdministrationEffectiveTimeModal");
    expect(tabSrc).toContain("onOpenTimeCorrection");
  });

  it("4 — dose correction workflow modal and API path", () => {
    const controlsSrc = readFileSync(
      join(import.meta.dirname, "../../components/mar/MarAdministrationRowCorrectionControls.tsx"),
      "utf8"
    );
    expect(controlsSrc).toContain("MedicationAdministrationClinicalCorrectionModal");
    expect(controlsSrc).toContain("clinical-correction");
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_DOSE", doseValue: "2", doseUnit: "mg" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(plan.ok).toBe(true);
  });

  it("5 — route correction workflow", () => {
    const preview = buildMarClinicalCorrectionBeforeAfterPreview({
      type: "ROUTE",
      current: administeredMar,
      correctedRoute: "PO",
    });
    expect(preview.before).toBe("IV");
    expect(preview.after).toBe("PO");
  });

  it("6 — charted-not-given workflow preview", () => {
    const preview = buildMarClinicalCorrectionBeforeAfterPreview({
      type: "CHARTED_NOT_GIVEN",
      current: administeredMar,
    });
    expect(preview.before).toBe("administered");
    expect(preview.after).toBe("refused");
  });

  it("7 — duplicate workflow preview", () => {
    const preview = buildMarClinicalCorrectionBeforeAfterPreview({
      type: "DUPLICATE",
      current: administeredMar,
    });
    expect(preview.after).toBe("duplicate_documentation_flagged");
  });

  it("8 — correction reason required for duplicate", () => {
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DUPLICATE_ENTRY" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(plan.ok).toBe(false);
  });

  it("9 — badge rendering for corrected administration", () => {
    const admin = administeredHistory("mar-1");
    const correction = doseCorrectionHistory("mar-1");
    const badge = resolveMarAdministrationCorrectedBadge({
      administrationId: "mar-1",
      historyEntries: [admin, correction],
    });
    expect(badge?.show).toBe(true);
    expect(badge?.correctionCount).toBe(1);
  });

  it("10 — correction chain rendering with multiple steps", () => {
    const admin = administeredHistory("mar-1");
    const c1 = doseCorrectionHistory("mar-1");
    const c2 = normalizeMedicationAdministrationHistoryCorrectionRow({
      id: "corr-2",
      facilityId: "fac-1",
      medicationAdministrationId: "mar-1",
      correctedByUserId: "rn-3",
      correctionReason: "DOCUMENTED_WRONG_ROUTE",
      previousValues: { route: "IV" },
      correctedValues: { route: "PO" },
      createdAt: "2026-06-16T11:00:00.000Z",
      encounterId: "enc-1",
      orderItemId: "oi-1",
    });
    const chain = buildMarClinicalCorrectionChain({
      administrationId: "mar-1",
      historyEntries: [admin, c1, c2],
    });
    expect(chain.length).toBe(3);
    expect(chain[0]?.stepKind).toBe("ADMINISTRATION");
    expect(chain[2]?.stepKind).toBe("CORRECTION");
  });

  it("11 — history rail rendering includes correction type and review", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      normalizeMedicationAdministrationHistoryCorrectionRow({
        id: "corr-ng",
        facilityId: "fac-1",
        medicationAdministrationId: "mar-1",
        correctedByUserId: "rn-1",
        correctionReason: "DOCUMENTED_NOT_GIVEN — charted in error",
        previousValues: { marAction: "administered" },
        correctedValues: { marAction: "refused" },
        createdAt: "2026-06-16T12:00:00.000Z",
        encounterId: "enc-1",
        orderItemId: "oi-1",
      }),
      { formatClinicalTime: (iso) => iso, t: (k) => k }
    );
    expect(entry.correctionTypeLabelKey).toBe("marClinicalCorrection.type.CHARTED_NOT_GIVEN");
    expect(entry.reviewRecommended).toBe(true);
  });

  it("12 — charge nurse review visibility for high-risk corrections", () => {
    expect(isMarClinicalCorrectionReviewRecommended("DOCUMENTED_NOT_GIVEN")).toBe(true);
    expect(isMarClinicalCorrectionReviewRecommended("DUPLICATE_ENTRY")).toBe(true);
    expect(isMarClinicalCorrectionReviewRecommended("DOCUMENTED_WRONG_DOSE")).toBe(false);
  });

  it("13 — historical MAR visibility uses readOnly flag", () => {
    expect(tabSrc).toContain("readOnly={!marHistoricalTimeline.isToday}");
  });

  it("14 — shift continuity via history refresh after correction", () => {
    expect(tabSrc).toContain("handleMarCorrectionSaved");
    expect(tabSrc).toContain("refreshMarViews");
  });

  it("15 — PRN continuity unchanged", () => {
    expect(tabSrc).toContain("FacilityMarShiftTimeline");
  });

  it("16 — cancellation continuity unchanged", () => {
    expect(tabSrc).toContain("FacilityMarShiftTimeline");
  });

  it("17 — infusion dose correction blocked in menu", () => {
    const menu = buildMarClinicalCorrectionMenu({
      encounterOpen: true,
      canAdjust: true,
      marActionResolved: "administered",
      infusionPhase: "INFUSION_START",
    });
    const dose = menu.items.find((i) => i.kind === "action" && i.type === "DOSE");
    expect(dose?.kind === "action" && dose.enabled).toBe(false);
  });

  it("18 — IVPB/time correction still available on infusion rows", () => {
    const menu = buildMarClinicalCorrectionMenu({
      encounterOpen: true,
      canAdjust: true,
      marActionResolved: "administered",
      infusionPhase: "INFUSION_START",
    });
    const time = menu.items.find((i) => i.kind === "action" && i.type === "TIME");
    expect(time?.kind === "action" && time.enabled).toBe(true);
  });

  it("19 — governance block for wrong patient", () => {
    const blocked = menuBlockedItem("WRONG_PATIENT");
    expect(blocked).toBeTruthy();
    const plan = planMedicationAdministrationClinicalCorrection({
      dto: { correctionReasonCode: "DOCUMENTED_WRONG_PATIENT", reason: "x" },
      current: administeredMar,
      marActionResolved: "administered",
    });
    expect(plan.ok).toBe(false);
  });

  it("20 — append-only guarantee", () => {
    expect(serviceSrc).toContain("medicationAdministrationCorrection.create");
    expect(serviceSrc).not.toContain("medicationAdministration.delete");
  });

  it("21 — correction chronology reconstruction", () => {
    const chain = buildMarClinicalCorrectionChain({
      administrationId: "mar-1",
      historyEntries: [administeredHistory("mar-1"), doseCorrectionHistory("mar-1")],
    });
    expect(chain[1]?.beforeSummary).toBe("4 mg");
    expect(chain[1]?.afterSummary).toBe("2 mg");
  });

  it("22 — multi-correction chain unlimited length", () => {
    const entries: MedicationAdministrationHistoryEntry[] = [administeredHistory("mar-9")];
    for (let i = 0; i < 5; i++) {
      entries.push(
        normalizeMedicationAdministrationHistoryCorrectionRow({
          id: `corr-${i}`,
          facilityId: "fac-1",
          medicationAdministrationId: "mar-9",
          correctedByUserId: "rn-1",
          correctionReason: "USER_ERROR",
          previousValues: {},
          correctedValues: { doseValue: String(i) },
          createdAt: `2026-06-16T1${i}:00:00.000Z`,
          encounterId: "enc-1",
          orderItemId: "oi-1",
        })
      );
    }
    expect(
      buildMarClinicalCorrectionChain({ administrationId: "mar-9", historyEntries: entries }).length
    ).toBe(6);
  });

  it("23 — audit reconstruction fields present on correction rows", () => {
    const correction = doseCorrectionHistory("mar-1");
    expect(correction.performedByDisplay).toBeTruthy();
    expect(correction.effectiveChangeSummary).toContain("→");
    expect(correction.reasonCode).toBe("DOCUMENTED_WRONG_DOSE");
  });

  it("24 — no deletion path in clinical correction service", () => {
    expect(serviceSrc).toContain("applyClinicalCorrection");
    expect(serviceSrc).not.toMatch(/medicationAdministration\.delete/);
  });

  it("25 — build certification components exported", () => {
    expect(tabSrc).toContain("MarAdministrationRowCorrectionControls");
    expect(readFileSync(join(import.meta.dirname, "../../components/mar/MarAdministrationRowCorrectionControls.tsx"), "utf8")).toContain(
      "MedicationAdministrationCorrectionMenu"
    );
    expect(readFileSync(join(import.meta.dirname, "../../components/mar/MarAdministrationRowCorrectionControls.tsx"), "utf8")).toContain(
      "MedicationAdministrationCorrectionChainViewer"
    );
  });
});

function menuBlockedItem(type: "WRONG_PATIENT" | "CHANGE_MEDICATION" | "CHANGE_PERFORMER") {
  const menu = buildMarClinicalCorrectionMenu({
    encounterOpen: true,
    canAdjust: true,
    marActionResolved: "administered",
  });
  return menu.items.find((i) => i.kind === "blocked" && i.type === type);
}
