import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveMedicationOrderItemFrequencyCode } from "@medora/shared";
import { describe, expect, it } from "vitest";
import type { CreateOrderLineItem } from "./types";
import {
  applyDefaultPlannedAdministrationIfNeeded,
  defaultPlannedAdministrationLocal,
  isAdministerToPatientIntent,
  medicationDirectionQuickPicksForRoute,
  MEDICATION_DIRECTION_QUICK_PICKS_GENERIC,
  patchMedicationLineWithPlannedAdminRules,
  stripMedicationFromOrderDraftPayload,
  toDatetimeLocalValue,
} from "./createOrderMedicationDraft";

function medLine(overrides?: Partial<CreateOrderLineItem>): CreateOrderLineItem {
  return {
    _lineId: "line-1",
    catalogItemType: "MEDICATION",
    _label: "Metformin",
    quantity: 1,
    ...overrides,
  };
}

describe("createOrderMedicationDraft (M1.7B.6)", () => {
  it("stripMedicationFromOrderDraftPayload clears medication staged lines and active medication form", () => {
    const payload = {
      activeTab: "MEDICATION" as const,
      stagedItems: {
        LAB: [],
        IMAGING: [],
        MEDICATION: [medLine()],
        CARE: [],
      },
      formData: {
        type: "MEDICATION" as const,
        items: [medLine({ _label: "Old order med" })],
      },
    };
    const stripped = stripMedicationFromOrderDraftPayload(payload);
    expect(stripped.stagedItems.MEDICATION).toEqual([]);
    expect(stripped.formData.items).toEqual([]);
  });

  it("stripMedicationFromOrderDraftPayload preserves non-medication draft content", () => {
    const labLine = {
      _lineId: "lab-1",
      catalogItemType: "LAB_TEST" as const,
      _label: "CBC",
    };
    const payload = {
      activeTab: "LAB" as const,
      stagedItems: {
        LAB: [labLine],
        IMAGING: [],
        MEDICATION: [medLine()],
        CARE: [],
      },
      formData: {
        type: "LAB" as const,
        items: [labLine],
      },
    };
    const stripped = stripMedicationFromOrderDraftPayload(payload);
    expect(stripped.stagedItems.LAB).toHaveLength(1);
    expect(stripped.stagedItems.MEDICATION).toEqual([]);
    expect(stripped.formData.items).toHaveLength(1);
  });

  it("defaults planned administration to now for administer-to-patient intent", () => {
    const fixed = new Date("2026-06-03T15:04:00");
    const line = applyDefaultPlannedAdministrationIfNeeded(
      medLine({ medicationFulfillmentIntent: "ADMINISTER_CHART" }),
      fixed
    );
    expect(line.intendedAdministrationAt).toBe(defaultPlannedAdministrationLocal(fixed));
    expect(line.intendedAdministrationAt).toBe(toDatetimeLocalValue(fixed));
  });

  it("does not default planned administration for pharmacy dispense", () => {
    const line = applyDefaultPlannedAdministrationIfNeeded(
      medLine({ medicationFulfillmentIntent: "PHARMACY_DISPENSE" })
    );
    expect(line.intendedAdministrationAt).toBeUndefined();
  });

  it("preserves manual planned administration edits", () => {
    const fixed = new Date("2026-06-03T15:04:00");
    const edited = patchMedicationLineWithPlannedAdminRules(
      medLine({ medicationFulfillmentIntent: "ADMINISTER_CHART" }),
      { intendedAdministrationAt: "2026-06-03T10:30" },
      fixed
    );
    expect(edited.intendedAdministrationAt).toBe("2026-06-03T10:30");
    expect(edited._plannedAdminAtTouched).toBe(true);

    const reDefault = applyDefaultPlannedAdministrationIfNeeded(edited, fixed);
    expect(reDefault.intendedAdministrationAt).toBe("2026-06-03T10:30");
  });

  it("clears planned administration when switching away from administer-to-patient", () => {
    const patched = patchMedicationLineWithPlannedAdminRules(
      medLine({
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        intendedAdministrationAt: "2026-06-03T10:30",
        _plannedAdminAtTouched: true,
      }),
      { medicationFulfillmentIntent: "PHARMACY_DISPENSE" }
    );
    expect(patched.intendedAdministrationAt).toBeUndefined();
    expect(isAdministerToPatientIntent(patched.medicationFulfillmentIntent)).toBe(false);
  });

});

describe("medicationDirectionQuickPicksForRoute (M1.8B.7J.6)", () => {
  it('medicationDirectionQuickPicksForRoute("PO") includes PO options', () => {
    const picks = medicationDirectionQuickPicksForRoute("PO");
    expect(picks).toContain("1 tab PO BID");
    expect(picks).toContain("1 tab PO daily");
    expect(picks).not.toContain("1 mL IVP now");
  });

  it('medicationDirectionQuickPicksForRoute("IVPB") includes q12h/q8h/q6h/q24h IVPB options', () => {
    const picks = medicationDirectionQuickPicksForRoute("IVPB");
    expect(picks).toContain("1 g IVPB q12h");
    expect(picks).toContain("1 g IVPB q8h");
    expect(picks).toContain("1 g IVPB q6h");
    expect(picks).toContain("1 g IVPB q24h");
    expect(picks).toContain("Vancomycin 1 g IVPB q12h");
    expect(picks).toContain("Cefepime 2 g IVPB q8h");
  });

  it('IVPB quick-picks do not include "1 tab PO BID"', () => {
    const picks = medicationDirectionQuickPicksForRoute("IVPB");
    expect(picks).not.toContain("1 tab PO BID");
    expect(picks).not.toContain("1 tab PO TID");
  });

  it('IVP quick-picks include IVP now', () => {
    const picks = medicationDirectionQuickPicksForRoute("IVP");
    expect(picks).toContain("1 mL IVP now");
    expect(picks).toContain("give IVP now");
    expect(picks).toContain("IVP once");
  });

  it("unknown route falls back to generic quick-picks", () => {
    expect(medicationDirectionQuickPicksForRoute(undefined)).toEqual([
      ...MEDICATION_DIRECTION_QUICK_PICKS_GENERIC,
    ]);
    expect(medicationDirectionQuickPicksForRoute("")).toEqual([...MEDICATION_DIRECTION_QUICK_PICKS_GENERIC]);
    expect(medicationDirectionQuickPicksForRoute("UNKNOWN")).toEqual([
      ...MEDICATION_DIRECTION_QUICK_PICKS_GENERIC,
    ]);
  });

  it('typing "1 g IVPB q12h" resolves frequencyCode Q12H for order payload', () => {
    expect(
      resolveMedicationOrderItemFrequencyCode({
        directionsSig: "1 g IVPB q12h",
      })
    ).toBe("Q12H");
  });

  it("PO BID directions still resolve frequencyCode BID for order payload", () => {
    expect(
      resolveMedicationOrderItemFrequencyCode({
        directionsSig: "1 tab PO BID",
      })
    ).toBe("BID");
  });
});

describe("CreateOrderModal medication draft wiring (M1.7B.6)", () => {
  it("strips medication from local draft on restore, persist, and close", () => {
    const modalSource = readFileSync(
      join(import.meta.dirname, "../CreateOrderModal.tsx"),
      "utf8"
    );
    expect(modalSource).toContain("stripMedicationFromOrderDraftPayload(draft.payload)");
    expect(modalSource).toContain("payload: persistPayload");
    expect(modalSource).toContain("clearMedicationOrderLocalState");
    expect(modalSource).toContain("handleClose");
  });

  it("SelectedMedicationItems uses route-specific directions datalist quick picks", () => {
    const source = readFileSync(join(import.meta.dirname, "SelectedMedicationItems.tsx"), "utf8");
    expect(source).toContain("list={lineDirectionsListId}");
    expect(source).toContain("medicationDirectionQuickPicksForRoute");
    expect(source).toContain("directionQuickPicks");
  });

  it("CreateOrderModal still infers frequencyCode from directions on submit", () => {
    const modalSource = readFileSync(join(import.meta.dirname, "../CreateOrderModal.tsx"), "utf8");
    expect(modalSource).toContain("resolveMedicationOrderItemFrequencyCode");
    expect(modalSource).toContain("frequencyCode: resolvedFrequencyCode");
  });
});
