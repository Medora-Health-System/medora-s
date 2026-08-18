/**
 * MEDUI.INP.2E — MAR enterprise workflow + performance convergence (web gates).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import { isRoutineMarDueAdministerShortcut } from "@/features/mar/marShiftTimelineActions";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrc = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(webSrc, rel), "utf8");

const enabledHandlers = {
  disabled: false,
  busy: false,
  onRequestAdminister: async () => undefined,
  onRequestStartInfusion: async () => true,
  onExecuteStopInfusion: async () => undefined,
  onExecuteRefuse: async () => undefined,
  onExecuteHold: async () => undefined,
};

function duePoItem(): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "dose-po",
    orderItemId: "oi-po",
    medicationLabel: "Lisinopril",
    primaryText: "Lisinopril",
    secondaryText: "Due",
    tertiaryText: "",
    doseStatus: "DUE",
    doseKind: "FIXED_ADMINISTRATION",
    route: "PO",
    frequencyCode: "DAILY",
    scheduledAt: "2026-08-18T12:00:00.000Z",
    dueWindowStartAt: "2026-08-18T12:00:00.000Z",
    dueWindowEndAt: "2026-08-18T13:00:00.000Z",
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
    hover: { title: "Lisinopril", due: "08:00", dose: "10 mg", route: "PO", witness: null, status: "Due" },
    actions: ["ADMINISTER", "REFUSE", "HOLD", "VIEW_ORDER"],
  };
}

describe("MEDUI.INP.2E MAR workflow", () => {
  it("Review Orders cannot POST medication administrations", () => {
    const panel = read("features/inpatient-workspace/InpatientReviewOrdersPanel.tsx");
    expect(panel).toContain("inpatientReviewOrdersInp2d.openMar");
    expect(panel).toContain('onNavigateSection?.("medications")');
    expect(panel).not.toContain("medication-administrations");
    const workspace = read("features/inpatient-workspace/InpatientWorkspacePanel.tsx");
    expect(workspace).toContain("MedicationAdministrationTab");
  });

  it("routine due cell click requests administer without opening the full order editor", () => {
    expect(isRoutineMarDueAdministerShortcut(duePoItem(), enabledHandlers)).toBe(true);
    expect(
      isRoutineMarDueAdministerShortcut({ ...duePoItem(), doseStatus: "OVERDUE" }, enabledHandlers)
    ).toBe(true);
    expect(
      isRoutineMarDueAdministerShortcut({ ...duePoItem(), doseStatus: "SCHEDULED" }, enabledHandlers)
    ).toBe(false);
    const timeline = read("components/encounters/FacilityMarShiftTimeline.tsx");
    expect(timeline).toContain("isRoutineMarDueAdministerShortcut");
    expect(timeline).toContain("onRequestAdminister");
    expect(timeline).toContain('data-testid="mar-shift-timeline-cell-more-actions"');
    expect(timeline).not.toContain("OrderEditor");
  });

  it("keeps double-click protection on the MAR administer submit path", () => {
    const marTab = read("components/encounters/MedicationAdministrationTab.tsx");
    expect(marTab).toContain("if (submitting) return");
    expect(marTab).toContain("setSubmitting(true)");
    expect(marTab).toContain("/encounters/${encounterId}/medication-administrations");
  });

  it("mirrors EN/FR MAR more-actions label", () => {
    expect(en.marShiftTimeline.moreActions).toBe("More actions");
    expect(fr.marShiftTimeline.moreActions).toBe("Plus d'actions");
  });
});
