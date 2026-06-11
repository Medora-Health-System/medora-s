import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMarShiftTimelineCellDisplay } from "@medora/shared";
import {
  isMarShiftTimelineActionShowComingSoon,
  isMarShiftTimelineActionEnabled,
} from "@/features/mar/marShiftTimelineActions";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function fallbackItem(
  overrides?: Partial<MarShiftTimelineCellItem>
): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "",
    orderItemId: "oi-now-1",
    medicationLabel: "Normal Saline",
    primaryText: "Normal Saline",
    secondaryText: "IV",
    tertiaryText: "ADMIN",
    doseStatus: "DUE",
    doseKind: "FIXED_ADMINISTRATION",
    route: "IV",
    frequencyCode: "NOW",
    scheduledAt: "2026-06-11T14:07:00.000Z",
    dueWindowStartAt: "2026-06-11T14:07:00.000Z",
    dueWindowEndAt: "2026-06-11T15:07:00.000Z",
    requiresWitness: false,
    readOnly: false,
    clinicalAction: "ADMINISTER",
    startedAt: null,
    startedByDisplay: null,
    startedByInitials: null,
    stoppedAt: null,
    stoppedByDisplay: null,
    stoppedByInitials: null,
    administeredAt: null,
    administeredByDisplay: null,
    administeredByInitials: null,
    completionSummary: null,
    hover: {
      title: "Normal Saline",
      due: "14:07",
      dose: null,
      route: "IV",
      witness: null,
      status: "Due",
    },
    actions: ["ADMINISTER", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
  };
}

describe("MAR OrderItem fallback visibility (M1.8B.7K.6)", () => {
  const timeline = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
    "utf8"
  );
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const service = readFileSync(
    join(import.meta.dirname, "../../../../api/src/medication-dose/mar-shift-timeline.service.ts"),
    "utf8"
  );
  const ordersPanel = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyErOrdersPanel.tsx"),
    "utf8"
  );

  it("Normal Saline IV now cell display uses IV and ADMIN", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Normal Saline",
      doseKind: "FIXED_ADMINISTRATION",
      doseStatus: "DUE",
      route: "IV",
      frequencyCode: "NOW",
      requiresWitness: false,
    });
    expect(display.secondaryText).toBe("IV");
    expect(display.tertiaryText).toBe("ADMIN");
  });

  it("STAT medication cell display uses STAT and ADMIN", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Normal Saline",
      doseKind: "FIXED_ADMINISTRATION",
      doseStatus: "DUE",
      route: "IV",
      frequencyCode: "STAT",
      requiresWitness: false,
    });
    expect(display.secondaryText).toBe("STAT");
    expect(display.tertiaryText).toBe("ADMIN");
  });

  it("timeline service loads OrderItem fallback placements", () => {
    expect(service).toContain("loadMarShiftTimelineOrderItemFallbackPlacements");
    expect(service).toContain("orderItemIdsWithDoseInstances");
  });

  it("fallback item opens drawer with administer action (coming soon until wired)", () => {
    expect(timeline).toContain("FacilityMarShiftTimelineDrawer");
    expect(drawer).toContain("FacilityMarShiftTimelineDrawer");
    const item = fallbackItem();
    expect(isMarShiftTimelineActionShowComingSoon("ADMINISTER", item)).toBe(true);
    expect(isMarShiftTimelineActionEnabled("ADMINISTER", item, null)).toBe(false);
  });

  it("IVPB fallback shows Start infusion clinical action", () => {
    const item = fallbackItem({
      doseKind: "IVPB_SESSION",
      route: "IVPB",
      frequencyCode: "ONCE",
      clinicalAction: "START_INFUSION",
      secondaryText: "START",
    });
    expect(item.clinicalAction).toBe("START_INFUSION");
    expect(isMarShiftTimelineActionShowComingSoon("ADMINISTER", item)).toBe(false);
  });

  it("Orders tab still routes medication execution to MAR", () => {
    expect(ordersPanel).toContain("isMedicationAdministrationManagedInMar");
    expect(ordersPanel).toContain("MEDICATION_ORDER_MAR_HELPER_I18N_KEY");
  });
});
