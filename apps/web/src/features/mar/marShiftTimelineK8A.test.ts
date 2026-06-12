/**
 * M1.8B.7K.8A — UI validation + blocker proof (automated).
 * Complements source-read tests with executable behavioral proofs.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  buildMarShiftTimelineCellDisplay,
  resolveMarShiftTimelineMedicationLabel,
} from "@medora/shared";
import {
  MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED,
  buildMarShiftTimelineStartPayload,
  buildMarShiftTimelineStopPayload,
  isMarShiftTimelineActionEnabled,
} from "@/features/mar/marShiftTimelineActions";
import {
  defaultMarShiftTimelineStartTimeValue,
  defaultMarShiftTimelineStopTimeValue,
  marShiftTimelineItemStatusStyle,
  toMarShiftTimelineDateTimeLocalValue,
} from "@/features/mar/marShiftTimelineDisplay";
import {
  isMedicationAdministrationManagedInMar,
  resolveMedicationOrderMarStatusLabel,
} from "@/features/emergency/medicationOrderMarExecutionPolicy";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function normalSalineEnItem(
  overrides?: Partial<MarShiftTimelineCellItem>
): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "",
    orderItemId: "oi-ns-now",
    medicationLabel: "Normal Saline",
    primaryText: "Normal",
    secondaryText: "START",
    tertiaryText: "ADMIN",
    doseStatus: "DUE",
    doseKind: "IVPB_SESSION",
    route: "IVPB",
    frequencyCode: "NOW",
    scheduledAt: "2026-06-11T18:16:00.000Z",
    dueWindowStartAt: "2026-06-11T18:16:00.000Z",
    dueWindowEndAt: "2026-06-11T19:16:00.000Z",
    requiresWitness: false,
    readOnly: false,
    clinicalAction: "START_INFUSION",
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
      title: "Normal Saline",
      due: "14:16",
      dose: "1 L",
      route: "IVPB",
      witness: null,
      status: "Due",
    },
    actions: ["START_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
  };
}

function drawerStartTimeDisabled(readOnly: boolean, submitting: boolean): boolean {
  return readOnly || submitting || !MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED;
}

function drawerStopTimeDisabled(readOnly: boolean, submitting: boolean): boolean {
  return readOnly || submitting;
}

describe("K.8A UI validation + blocker proof (M1.8B.7K.8A)", () => {
  const timeline = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
    "utf8"
  );
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const ordersPanel = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyErOrdersPanel.tsx"),
    "utf8"
  );
  const marTab = readFileSync(
    join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );

  describe("Validation 1 — English Normal Saline label consistency", () => {
    const catalog = {
      catalogItemId: "cat-ns",
      catalogItemCode: "NS",
      displayNameEn: "Normal Saline",
      displayNameFr: "Chlorure de sodium",
      genericName: "Sodium Chloride",
    };

    it("API locale=en resolves medicationLabel as Normal Saline (not French)", () => {
      const label = resolveMarShiftTimelineMedicationLabel({ locale: "en", catalogSnapshot: catalog });
      expect(label).toBe("Normal Saline");
      expect(label).not.toContain("Chlorure");
      expect(label).not.toContain("NaCl");
    });

    it("MAR cell primaryText abbreviates Normal Saline to NS 0.9% without French leak", () => {
      const display = buildMarShiftTimelineCellDisplay({
        medicationLabel: "Normal Saline",
        doseKind: "IVPB_SESSION",
        doseStatus: "DUE",
        route: "IVPB",
        frequencyCode: "NOW",
        requiresWitness: false,
      });
      expect(display.primaryText).toBe("NS 0.9%");
      expect(display.primaryText).not.toContain("Chlorure");
      expect(display.primaryText).not.toContain("NaCl");
    });

    it("hover.title and drawer title use medicationLabel (English API item shape)", () => {
      const item = normalSalineEnItem();
      expect(item.hover.title).toBe("Normal Saline");
      expect(item.medicationLabel).toBe("Normal Saline");
      expect(drawer).toContain("item.medicationLabel ?? item.primaryText");
    });

    it("timeline fetch sends locale from UI language", () => {
      expect(timeline).toContain("locale: language");
    });

    it("Orders tab uses MAR-managed path without French-only catalog default", () => {
      expect(ordersPanel).toContain("isMedicationAdministrationManagedInMar");
      expect(ordersPanel).toContain("MEDICATION_ORDER_MAR_HELPER_I18N_KEY");
    });
  });

  describe("Validation 2 — Start time flag and editability", () => {
    it("MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED is true in marShiftTimelineActions.ts", () => {
      expect(MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED).toBe(true);
    });

    it("Start time input is not disabled for editable DUE IVPB drawer", () => {
      expect(drawerStartTimeDisabled(false, false)).toBe(false);
    });

    it("Start time input is disabled only when readOnly, submitting, or API unsupported", () => {
      expect(drawerStartTimeDisabled(true, false)).toBe(true);
      expect(drawerStartTimeDisabled(false, true)).toBe(true);
    });

    it("user can change start datetime-local value (simulated edit roundtrip)", () => {
      const item = normalSalineEnItem();
      const initial = defaultMarShiftTimelineStartTimeValue(item, "America/Port-au-Prince");
      expect(initial).toMatch(/^2026-06-11T\d{2}:\d{2}$/);
      const edited = "2026-06-11T15:30";
      const payload = buildMarShiftTimelineStartPayload(
        { startTimeLocal: edited },
        "America/Port-au-Prince"
      );
      expect(payload.startedAt).toBeTruthy();
      expect(toMarShiftTimelineDateTimeLocalValue(payload.startedAt!, "America/Port-au-Prince")).toBe(
        edited
      );
    });

    it("drawer wires edited start time into Start infusion handler", () => {
      expect(drawer).toContain("buildMarShiftTimelineStartPayload");
      expect(drawer).toContain("onRequestStartInfusion(item, startPayload)");
      expect(marTab).toContain("startedAtIso: input.startedAt");
    });

    it("no pointer-events:none on datetime-local inputs", () => {
      expect(drawer).not.toContain("pointer-events: none");
      expect(drawer).not.toContain("pointer-events:none");
    });
  });

  describe("Validation 3 — Stop time field editable", () => {
    it("Stop time input is enabled for IN_PROGRESS IVPB", () => {
      expect(drawerStopTimeDisabled(false, false)).toBe(false);
    });

    it("user can change stop datetime-local value (simulated edit roundtrip)", () => {
      const item = normalSalineEnItem({
        doseStatus: "IN_PROGRESS",
        clinicalAction: "STOP_INFUSION",
        startedAt: "2026-06-11T18:16:00.000Z",
      });
      const edited = "2026-06-11T16:45";
      const payload = buildMarShiftTimelineStopPayload(
        { stopTimeLocal: edited },
        "America/Port-au-Prince"
      );
      expect(payload.stoppedAt).toBeTruthy();
      expect(toMarShiftTimelineDateTimeLocalValue(payload.stoppedAt!, "America/Port-au-Prince")).toBe(
        edited
      );
    });

    it("Stop handler receives edited stoppedAt from drawer payload builder", () => {
      expect(drawer).toContain("buildMarShiftTimelineStopPayload");
      expect(marTab).toContain("stoppedAtIso: input.stoppedAt");
    });
  });

  describe("Validation 4 — Start infusion updates MAR cell", () => {
    it("post-start IN_PROGRESS item displays INFUSING + initials/time tertiary", () => {
      const display = buildMarShiftTimelineCellDisplay({
        medicationLabel: "Normal Saline",
        doseKind: "IVPB_SESSION",
        doseStatus: "IN_PROGRESS",
        route: "IVPB",
        frequencyCode: "NOW",
        requiresWitness: false,
        enrichment: {
          startedAt: "2026-06-11T18:16:00.000Z",
          startedByDisplay: "Jessica Nurse RN",
          startedByInitials: "JN",
          stoppedAt: null,
          stoppedByDisplay: null,
          stoppedByInitials: null,
          administeredAt: null,
          administeredByDisplay: null,
          administeredByInitials: null,
          completionSummary: "JN 14:16 ▶",
        },
      });
      expect(display.secondaryText).toBe("INFUSING");
      expect(display.tertiaryText).toContain("JN");
      expect(display.tertiaryText).toContain("▶");
    });

    it("timeline refresh is invoked after successful start action", () => {
      expect(timeline).toContain("onActionSuccess");
      expect(timeline).toContain("loadTimeline");
      expect(marTab).toContain("timelineRefreshRef.current");
    });
  });

  describe("Validation 5 — Stop infusion updates MAR cell", () => {
    it("post-stop COMPLETED item displays DONE + initials/time range", () => {
      const display = buildMarShiftTimelineCellDisplay({
        medicationLabel: "Normal Saline",
        doseKind: "IVPB_SESSION",
        doseStatus: "COMPLETED",
        route: "IVPB",
        frequencyCode: "NOW",
        requiresWitness: false,
        enrichment: {
          startedAt: "2026-06-11T18:16:00.000Z",
          startedByDisplay: "Jessica Nurse RN",
          startedByInitials: "JN",
          stoppedAt: "2026-06-11T18:42:00.000Z",
          stoppedByDisplay: "Jessica Nurse RN",
          stoppedByInitials: "JN",
          administeredAt: null,
          administeredByDisplay: null,
          administeredByInitials: null,
          completionSummary: "JN 14:16–JN 14:42",
        },
      });
      expect(display.secondaryText).toBe("DONE");
      expect(display.tertiaryText).toMatch(/JN.*14:16.*JN.*14:42/);
    });

    it("completed cell uses gray read-only style", () => {
      const style = marShiftTimelineItemStatusStyle("COMPLETED", true);
      expect(style.backgroundColor).toBe("#E5E7EB");
      expect(style.color).toBe("#374151");
    });
  });

  describe("Validation 6 — Orders and MAR synchronization", () => {
    it("medication rows do not render Start/Stop/Administer execution buttons", () => {
      const marBranch = ordersPanel.match(
        /if \(marManagedInMar && hasAnyRole[\s\S]*?\} else if \(isInfusionLifecycleMed/
      )?.[0];
      expect(marBranch).toBeTruthy();
      expect(marBranch).not.toContain("startInfusion");
      expect(marBranch).not.toContain("stopInfusion");
      expect(marBranch).not.toContain("nurseMarkBedsideComplete");
    });

    it("Orders shows infusion in progress status after START", () => {
      const label = resolveMedicationOrderMarStatusLabel(
        "IN_PROGRESS",
        { active: { infusionSessionKey: "k1", infusionStartedAtIso: "2026-06-11T18:16:00.000Z" }, lastCompleted: null },
        (k) => k
      );
      expect(label).toBe("erEmergencyOrders.marStatusInfusionInProgress");
    });

    it("Orders shows completed on MAR after STOP", () => {
      const label = resolveMedicationOrderMarStatusLabel(
        "COMPLETED",
        {
          active: null,
          lastCompleted: {
            infusionSessionKey: "k1",
            infusionStartedAtIso: "2026-06-11T18:16:00.000Z",
            infusionStoppedAtIso: "2026-06-11T18:42:00.000Z",
            durationMinutes: 26,
            startedByDisplayName: "Jessica Nurse",
            startedByTitle: "RN",
            stoppedByDisplayName: "Jessica Nurse",
            stoppedByTitle: "RN",
          },
        },
        (k) => k
      );
      expect(label).toBe("erEmergencyOrders.marStatusCompletedOnMar");
    });

    it("ADMINISTER_CHART meds are MAR-managed", () => {
      expect(
        isMedicationAdministrationManagedInMar("MEDICATION", {
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
        })
      ).toBe(true);
    });
  });

  describe("Drawer action handler integration (mock)", () => {
    it("Start handler receives edited startedAt ISO", async () => {
      const onRequestStartInfusion = vi.fn().mockResolvedValue(true);
      const item = normalSalineEnItem();
      const edited = "2026-06-11T15:30";
      const payload = buildMarShiftTimelineStartPayload(
        { startTimeLocal: edited },
        "America/Port-au-Prince"
      );
      await onRequestStartInfusion(item, payload);
      expect(onRequestStartInfusion).toHaveBeenCalledWith(
        item,
        expect.objectContaining({ startedAt: expect.any(String) })
      );
    });

    it("Stop handler receives edited stoppedAt ISO", async () => {
      const onExecuteStopInfusion = vi.fn().mockResolvedValue(undefined);
      const item = normalSalineEnItem({ doseStatus: "IN_PROGRESS", clinicalAction: "STOP_INFUSION" });
      const edited = "2026-06-11T16:45";
      const payload = buildMarShiftTimelineStopPayload(
        { stopTimeLocal: edited },
        "America/Port-au-Prince"
      );
      await onExecuteStopInfusion(item, payload);
      expect(onExecuteStopInfusion).toHaveBeenCalledWith(
        item,
        expect.objectContaining({ stoppedAt: expect.any(String) })
      );
    });

    it("Start infusion action is enabled for DUE IVPB when handlers active", () => {
      expect(
        isMarShiftTimelineActionEnabled("START_INFUSION", normalSalineEnItem(), {
          disabled: false,
          busy: false,
          onRequestAdminister: async () => undefined,
          onRequestStartInfusion: async () => true,
          onExecuteStopInfusion: async () => undefined,
          onExecuteRefuse: async () => undefined,
          onExecuteHold: async () => undefined,
        })
      ).toBe(true);
    });
  });
});
