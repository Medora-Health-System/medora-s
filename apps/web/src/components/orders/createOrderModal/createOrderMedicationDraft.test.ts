import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clinicalDatetimeLocalFromInstant, resolveMedicationOrderItemFrequencyCode, wallClockToUtc } from "@medora/shared";
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
      undefined,
      fixed
    );
    expect(line.intendedAdministrationAt).toBe(defaultPlannedAdministrationLocal(undefined, fixed));
    expect(line.intendedAdministrationAt).toBe(toDatetimeLocalValue(fixed));
  });

  it("defaults planned administration in facility timezone when provided (K10B1)", () => {
    const fixed = wallClockToUtc(2026, 6, 11, 22, 15, "America/Port-au-Prince");
    const line = applyDefaultPlannedAdministrationIfNeeded(
      medLine({ medicationFulfillmentIntent: "ADMINISTER_CHART" }),
      "America/Port-au-Prince",
      fixed
    );
    expect(line.intendedAdministrationAt).toBe(
      clinicalDatetimeLocalFromInstant(fixed, "America/Port-au-Prince")
    );
    expect(line.intendedAdministrationAt).toBe("2026-06-11T22:15");
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
      undefined,
      fixed
    );
    expect(edited.intendedAdministrationAt).toBe("2026-06-03T10:30");
    expect(edited._plannedAdminAtTouched).toBe(true);

    const reDefault = applyDefaultPlannedAdministrationIfNeeded(edited, undefined, fixed);
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

describe("medicationDirectionQuickPicksForRoute (M1.8B.7J.6 / 7J.6A)", () => {
  it('medicationDirectionQuickPicksForRoute("IVPB") includes one-time and recurring IVPB options', () => {
    const picks = medicationDirectionQuickPicksForRoute("IVPB");
    expect(picks).toContain("now");
    expect(picks).toContain("once");
    expect(picks).toContain("give IVPB now");
    expect(picks).toContain("IVPB once");
    expect(picks).toContain("1 g IVPB q12h");
    expect(picks).toContain("1 g IVPB q8h");
    expect(picks).toContain("1 g IVPB q6h");
    expect(picks).toContain("1 g IVPB q24h");
    expect(picks).toContain("Vancomycin 1 g IVPB q12h");
    expect(picks).toContain("Cefepime 2 g IVPB q8h");
  });

  it('medicationDirectionQuickPicksForRoute("ivpb") returns IVPB set', () => {
    expect(medicationDirectionQuickPicksForRoute("ivpb")).toEqual([
      ...medicationDirectionQuickPicksForRoute("IVPB"),
    ]);
  });

  it('medicationDirectionQuickPicksForRoute("IV Piggyback") returns IVPB set', () => {
    const picks = medicationDirectionQuickPicksForRoute("IV Piggyback");
    expect(picks).toContain("1 g IVPB q12h");
    expect(picks).toContain("give IVPB now");
    expect(picks).not.toContain("1 tab PO BID");
  });

  it('medicationDirectionQuickPicksForRoute("PIGGYBACK") and INTRAVENOUS_PIGGYBACK return IVPB set', () => {
    for (const route of ["PIGGYBACK", "INTRAVENOUS_PIGGYBACK"] as const) {
      const picks = medicationDirectionQuickPicksForRoute(route);
      expect(picks).toContain("1 g IVPB q8h");
      expect(picks).not.toContain("1 tab PO BID");
    }
  });

  it('IVPB set excludes "1 tab PO BID"', () => {
    const picks = medicationDirectionQuickPicksForRoute("IVPB");
    expect(picks).not.toContain("1 tab PO BID");
    expect(picks).not.toContain("1 tab PO daily");
    expect(picks).not.toContain("1 tab PO TID");
  });

  it('medicationDirectionQuickPicksForRoute("PO") includes PO options', () => {
    const picks = medicationDirectionQuickPicksForRoute("PO");
    expect(picks).toContain("1 tab PO BID");
    expect(picks).toContain("1 tab PO daily");
    expect(picks).not.toContain("1 mL IVP now");
    expect(picks).not.toContain("1 g IVPB q12h");
  });

  it('IVP quick-picks include IVP now', () => {
    const picks = medicationDirectionQuickPicksForRoute("IVP");
    expect(picks).toContain("1 mL IVP now");
    expect(picks).toContain("give IVP now");
    expect(picks).toContain("IVP once");
  });

  it("unknown/blank route returns generic only", () => {
    expect(medicationDirectionQuickPicksForRoute(undefined)).toEqual([
      ...MEDICATION_DIRECTION_QUICK_PICKS_GENERIC,
    ]);
    expect(medicationDirectionQuickPicksForRoute("")).toEqual([...MEDICATION_DIRECTION_QUICK_PICKS_GENERIC]);
    expect(medicationDirectionQuickPicksForRoute("UNKNOWN")).toEqual([
      ...MEDICATION_DIRECTION_QUICK_PICKS_GENERIC,
    ]);
    expect(medicationDirectionQuickPicksForRoute("IV")).toEqual([
      ...MEDICATION_DIRECTION_QUICK_PICKS_GENERIC,
    ]);
    expect(medicationDirectionQuickPicksForRoute("intravenous")).toEqual([
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

  it('"give IVPB now" resolves frequencyCode NOW (direct-MAR, not recurring)', () => {
    expect(
      resolveMedicationOrderItemFrequencyCode({
        directionsSig: "give IVPB now",
      })
    ).toBe("NOW");
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

  it("SelectedMedicationItems uses item.route for route-specific directions datalist quick picks", () => {
    const source = readFileSync(join(import.meta.dirname, "SelectedMedicationItems.tsx"), "utf8");
    expect(source).toContain("medicationDirectionQuickPicksForRoute(item.route)");
    expect(source).toContain("list={lineDirectionsListId}");
    expect(source).toContain("directionQuickPicks");
  });

  it("SelectedMedicationItems renders per-line datalist ids for mixed-route orders", () => {
    const source = readFileSync(join(import.meta.dirname, "SelectedMedicationItems.tsx"), "utf8");
    expect(source).toContain("`${directionsListIdPrefix}-${item._lineId}`");
    expect(source).toContain("<datalist id={lineDirectionsListId}>");
  });

  it("CreateOrderModal still infers frequencyCode from directions on submit", () => {
    const modalSource = readFileSync(join(import.meta.dirname, "../CreateOrderModal.tsx"), "utf8");
    expect(modalSource).toContain("resolveMedicationOrderItemFrequencyCode");
    expect(modalSource).toContain("frequencyCode: resolvedFrequencyCode");
  });
});
