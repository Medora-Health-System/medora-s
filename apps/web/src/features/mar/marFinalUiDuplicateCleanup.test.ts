import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  dedupeMarShiftTimelineDrawerDetailRows,
  isMarShiftTimelineDrawerRateRedundantWithDirections,
  localizeMarShiftTimelineSecondaryText,
  resolveMarShiftTimelineDrawerConsolidatedRate,
  resolveMarShiftTimelineDrawerDoseEmphasis,
  resolveMarShiftTimelineResponseTimelineLabelKey,
} from "./marShiftTimelineDisplay";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const timelineSrc = readFileSync(
  join(process.cwd(), "src/components/encounters/FacilityMarShiftTimeline.tsx"),
  "utf8"
);
const drawerSrc = readFileSync(
  join(process.cwd(), "src/components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
  "utf8"
);

const t = (key: string) => {
  const labels: Record<string, string> = {
    "marMedicationResponse.timeline.completed": "Response Completed",
    "marMedicationResponse.timeline.badgeCompleted": "Response Completed",
    "marMedicationResponse.timeline.recommended": "Response Recommended",
    "marMedicationResponse.timeline.overdue": "Response Overdue",
  };
  return labels[key] ?? key;
};

function prnAcetaminophenItem(): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "",
    orderItemId: "oi-prn-acet",
    medicationLabel: "Acetaminophen",
    primaryText: "Acetaminophen",
    secondaryText: "Q6H PRN",
    tertiaryText: "PRN",
    doseStatus: "DUE",
    doseKind: "FIXED_ADMINISTRATION",
    route: "PO",
    frequencyCode: "Q6H",
    scheduledAt: new Date().toISOString(),
    dueWindowStartAt: new Date().toISOString(),
    dueWindowEndAt: new Date().toISOString(),
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
    isPrnBand: true,
    prnFrequencyLabel: "Q6H PRN",
    prnLastGivenAt: "2026-06-27T10:00:00.000Z",
    prnNextEligibleAt: "2026-06-27T16:00:00.000Z",
    orderPrnIndication: "for pain",
    hover: {
      title: "Acetaminophen",
      due: "PRN",
      dose: "500 mg",
      route: "PO",
      witness: null,
      status: "Due",
    },
    actions: ["ADMINISTER"],
  };
}

describe("MAR final UI duplicate cleanup (MEDUI.MAR.FINAL_UI_DUPLICATE_CLEANUP_CERTIFICATION_FIX.1)", () => {
  it("ondansetron-style completed response suppresses duplicate badge when secondary localizes", () => {
    const item = {
      secondaryText: "DONE",
      medicationResponses: [{ responseCode: "NO_NAUSEA" } as never],
      respiratoryMedicationResponses: [],
      medicationResponseFollowUp: null,
      medicationResponseBadge: { label: "RESPONSE" as const, displayLabel: "RESPONSE", count: 1, severity: "routine" as const },
    };

    const labelKey = resolveMarShiftTimelineResponseTimelineLabelKey(item);
    expect(labelKey).toBe("marMedicationResponse.timeline.completed");
    expect(localizeMarShiftTimelineSecondaryText(item, t)).toBe("Response Completed");
    expect(timelineSrc).toContain("!responseTimelineLabelKey");
  });

  it("response follow-up panel remains wired in drawer", () => {
    expect(drawerSrc).toContain("MedicationFollowUpPanel");
  });

  it("NS 0.9% drawer consolidates rate to a single row", () => {
    const rate = resolveMarShiftTimelineDrawerConsolidatedRate({
      fluidRateLabel: "125 mL/hr",
      hover: { title: "NS 0.9%", due: "", dose: null, route: "IV", rate: "125 mL/hr", witness: null, status: "Due" },
    });
    expect(rate).toBe("125 mL/hr");

    const deduped = dedupeMarShiftTimelineDrawerDetailRows([
      { label: "Rate", value: "125 mL/hr", testId: "a" },
      { label: "Débit", value: "125 mL/hr", testId: "b" },
    ]);
    expect(deduped).toHaveLength(1);

    expect(drawerSrc).toContain("resolveMarShiftTimelineDrawerConsolidatedRate");
    expect(drawerSrc).not.toContain('testId: "mar-shift-timeline-drawer-fluid-rate"');
    expect(drawerSrc).toContain('testId: "mar-shift-timeline-drawer-rate"');
  });

  it("skips rate detail row when rate already appears in directions emphasis", () => {
    expect(
      isMarShiftTimelineDrawerRateRedundantWithDirections({
        rate: "125 mL/hr",
        directionsLabel: "125 mL/hr continuous IV",
      })
    ).toBe(true);
  });

  it("continuous fluid runtime panel and actions remain in drawer", () => {
    expect(drawerSrc).toContain("ContinuousInfusionRuntimePanel");
    expect(drawerSrc).toContain("START_FLUID");
    expect(drawerSrc).toContain("PAUSE_FLUID");
    expect(drawerSrc).toContain("STOP_FLUID");
  });

  it("PRN acetaminophen drawer derives dose emphasis from hover metadata", () => {
    const emphasis = resolveMarShiftTimelineDrawerDoseEmphasis(prnAcetaminophenItem());
    expect(emphasis?.doseLabel).toBe("500 mg");
    expect(emphasis?.routeLabel).toBe("PO");
    expect(emphasis?.directionsLabel).toBe("for pain");
    expect(drawerSrc).toContain("resolveMarShiftTimelineDrawerDoseEmphasis");
    expect(drawerSrc).toContain("isPrnItem && prnFrequencyDisplay");
  });

  it("PRN last given and next eligible rows remain in drawer detail list", () => {
    expect(drawerSrc).toContain('testId: "mar-shift-timeline-drawer-prn-last-given"');
    expect(drawerSrc).toContain('testId: "mar-shift-timeline-drawer-prn-next-eligible"');
  });
});
