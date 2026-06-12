import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineCellDisplay,
  resolveStandardMarShiftTimelineWindow,
  wallClockToUtc,
  buildMarShiftTimelineColumns,
  resolveMarShiftTimelineColumnKey,
} from "@medora/shared";
import {
  isMarShiftTimelineActionEnabled,
  isMarShiftTimelineActionShowComingSoon,
} from "@/features/mar/marShiftTimelineActions";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "..", "..");
const haitiTz = "America/Port-au-Prince";

function metoprololItem(
  overrides?: Partial<MarShiftTimelineCellItem>
): MarShiftTimelineCellItem {
  const createdAt = wallClockToUtc(2026, 6, 3, 21, 7, haitiTz);
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "",
    orderItemId: "oi-metoprolol-now",
    medicationLabel: "Metoprolol 25 mg",
    primaryText: "Metoprolol",
    secondaryText: "PO",
    tertiaryText: "ADMIN",
    doseStatus: "DUE",
    doseKind: "FIXED_ADMINISTRATION",
    route: "PO",
    frequencyCode: "NOW",
    scheduledAt: createdAt.toISOString(),
    dueWindowStartAt: createdAt.toISOString(),
    dueWindowEndAt: new Date(createdAt.getTime() + 3_600_000).toISOString(),
    requiresWitness: false,
    readOnly: false,
    clinicalAction: "ADMINISTER",
    startedAt: null,
    stoppedAt: null,
    startedByDisplay: null,
    startedByInitials: null,
    stoppedByDisplay: null,
    stoppedByInitials: null,
    administeredAt: null,
    administeredByDisplay: null,
    administeredByInitials: null,
    completionSummary: null,
    hover: {
      title: "Metoprolol 25 mg",
      due: "21:07",
      dose: "25 mg",
      route: "PO",
      witness: null,
      status: "Due",
    },
    actions: ["ADMINISTER", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
  };
}

const enabledHandlers = {
  disabled: false,
  busy: false,
  onRequestAdminister: async () => undefined,
  onRequestStartInfusion: async () => true,
  onExecuteStopInfusion: async () => undefined,
  onExecuteRefuse: async () => undefined,
  onExecuteHold: async () => undefined,
};

describe("MAR shift timeline K.9 placement, actions, labels", () => {
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const marTab = readFileSync(
    join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );

  it("Metoprolol NOW at 9:07 PM Haiti maps to 09P column", () => {
    const createdAt = wallClockToUtc(2026, 6, 3, 21, 7, haitiTz);
    const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", createdAt, haitiTz);
    const columns = buildMarShiftTimelineColumns(startAt, endAt, haitiTz);
    const key = resolveMarShiftTimelineColumnKey({
      scheduledAt: createdAt,
      dueWindowStartAt: createdAt,
      columns,
      facilityTimeZone: haitiTz,
    });
    expect(columns.find((c) => c.key === key)?.label).toBe("09P");
  });

  it("Metoprolol drawer enables Administer for NOW PO", () => {
    const item = metoprololItem();
    expect(isMarShiftTimelineActionEnabled("ADMINISTER", item, enabledHandlers)).toBe(true);
    expect(isMarShiftTimelineActionShowComingSoon("ADMINISTER", item)).toBe(false);
  });

  it("MAR tab wires administer and terminal MAR handlers", () => {
    expect(marTab).toContain("onRequestAdminister");
    expect(marTab).toContain("openModalFromTimelineItem");
    expect(marTab).toContain("onExecuteRefuse");
    expect(marTab).toContain("onExecuteHold");
    expect(marTab).toContain("submitMarShiftTimelineTerminalMar");
  });

  it("Normal Saline cell primaryText is NS 0.9%", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Normal Saline 0.9% 1 L",
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      route: "IVPB",
      frequencyCode: "NOW",
      requiresWitness: false,
    });
    expect(display.primaryText).toBe("NS 0.9% 1 L");
  });

  it("drawer includes refuse/hold reason modal", () => {
    expect(drawer).toContain('data-testid="mar-shift-timeline-reason-modal"');
    expect(drawer).toContain("onRequestAdminister");
    expect(drawer).toContain("MAR_SHIFT_TIMELINE_REFUSE_REASON_CODES");
  });

  it("Refuse and Hold require reason selection in drawer", () => {
    expect(drawer).toContain('data-testid="mar-shift-timeline-reason-code"');
    expect(drawer).toContain("reasonModal.reasonRequired");
  });
});
