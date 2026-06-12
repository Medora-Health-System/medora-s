import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import {
  validateMarShiftTimelineStopTime,
  buildMarShiftTimelineStopPayload,
} from "@/features/mar/marShiftTimelineActions";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";
import {
  marShiftTimelineShiftStorageKey,
  readStoredMarShiftTimelineShiftCode,
  writeStoredMarShiftTimelineShiftCode,
} from "@/lib/marShiftTimelineUiState";

const webSrcRoot = join(process.cwd(), "src");

function readSrc(rel: string): string {
  return readFileSync(join(webSrcRoot, rel), "utf8");
}

function ivpbInProgressItem(overrides: Partial<MarShiftTimelineCellItem> = {}): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    medicationDoseInstanceId: "",
    orderItemId: "order-item-1",
    medicationLabel: "Azithromycin",
    primaryText: "Azithromycin",
    secondaryText: "IVPB",
    tertiaryText: "INFUSING",
    doseStatus: "IN_PROGRESS",
    doseKind: "IVPB_SESSION",
    route: "IVPB",
    frequencyCode: "NOW",
    scheduledAt: "2026-06-11T22:00:00.000Z",
    dueWindowStartAt: "2026-06-11T22:00:00.000Z",
    dueWindowEndAt: "2026-06-11T23:00:00.000Z",
    requiresWitness: false,
    readOnly: false,
    clinicalAction: "STOP_INFUSION",
    startedAt: "2026-06-11T22:00:00.000Z",
    startedByDisplay: "Elizabeth Posada RN",
    startedByInitials: "EP",
    stoppedAt: null,
    stoppedByDisplay: null,
    stoppedByInitials: null,
    administeredAt: null,
    administeredByDisplay: null,
    administeredByInitials: null,
    completionSummary: null,
    hover: {
      title: "Azithromycin",
      due: "22:00",
      dose: "500 mg",
      route: "IVPB",
      witness: null,
      status: "In progress",
    },
    actions: ["STOP_INFUSION", "REFUSE", "HOLD", "VIEW_ORDER"],
    ...overrides,
  };
}

describe("M1.8B.7K.10 — stop infusion + shift persistence", () => {
  describe("Stop infusion payload and validation", () => {
    it("stop payload uses stoppedAt field for API (not stoppedAtIso)", () => {
      const marTab = readSrc("components/encounters/MedicationAdministrationTab.tsx");
      const api = readSrc("lib/medicationInfusionApi.ts");
      expect(marTab).toContain("stoppedAtIso: input.stoppedAt");
      expect(api).toContain("stoppedAt?: string");
      expect(api).toContain("/infusion/stop");
    });

    it("rejects stop time before start in client validation", () => {
      const item = ivpbInProgressItem({ startedAt: "2026-06-11T22:00:00.000Z" });
      const result = validateMarShiftTimelineStopTime(item, "2026-06-11T16:00", "America/Port-au-Prince");
      expect(result).toEqual({ ok: false, reason: "before_start" });
    });

    it("accepts stop time after start", () => {
      const item = ivpbInProgressItem({ startedAt: "2026-06-11T22:00:00.000Z" });
      const result = validateMarShiftTimelineStopTime(item, "2026-06-11T19:30", "America/Port-au-Prince");
      expect(result).toEqual({ ok: true });
    });

    it("buildMarShiftTimelineStopPayload produces UTC ISO stoppedAt", () => {
      const payload = buildMarShiftTimelineStopPayload(
        { stopTimeLocal: "2026-06-11T18:45" },
        "America/Port-au-Prince"
      );
      expect(payload.stoppedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("drawer validates stop time before calling handler", () => {
      const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
      expect(drawer).toContain("validateMarShiftTimelineStopTime");
      expect(drawer).toContain("marShiftTimeline.stopTimeBeforeStart");
    });

    it("drawer surfaces action errors from backend", () => {
      const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
      expect(drawer).toContain("mar-shift-timeline-drawer-action-error");
      expect(drawer).toContain("e instanceof Error ? e.message");
    });
  });

  describe("Shift selection persistence", () => {
    const facilityA = "fac-a";
    const facilityB = "fac-b";
    const userA = "user-a";
    const userB = "user-b";
    let storage: Record<string, string>;

    beforeEach(() => {
      storage = {};
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          storage = {};
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("stores 7P_7A under facility+user key", () => {
      writeStoredMarShiftTimelineShiftCode(facilityA, userA, "7P_7A");
      expect(localStorage.getItem(marShiftTimelineShiftStorageKey(facilityA, userA))).toBe("7P_7A");
    });

    it("restores stored shift for same facility and user", () => {
      writeStoredMarShiftTimelineShiftCode(facilityA, userA, "7P_7A");
      expect(readStoredMarShiftTimelineShiftCode(facilityA, userA)).toBe("7P_7A");
    });

    it("isolates storage by facilityId", () => {
      writeStoredMarShiftTimelineShiftCode(facilityA, userA, "7P_7A");
      writeStoredMarShiftTimelineShiftCode(facilityB, userA, "12P_12A");
      expect(readStoredMarShiftTimelineShiftCode(facilityA, userA)).toBe("7P_7A");
      expect(readStoredMarShiftTimelineShiftCode(facilityB, userA)).toBe("12P_12A");
    });

    it("isolates storage by userId", () => {
      writeStoredMarShiftTimelineShiftCode(facilityA, userA, "7P_7A");
      writeStoredMarShiftTimelineShiftCode(facilityA, userB, "3P_3A");
      expect(readStoredMarShiftTimelineShiftCode(facilityA, userA)).toBe("7P_7A");
      expect(readStoredMarShiftTimelineShiftCode(facilityA, userB)).toBe("3P_3A");
    });

    it("ignores invalid stored shift", () => {
      localStorage.setItem(marShiftTimelineShiftStorageKey(facilityA, userA), "NOT_A_SHIFT");
      expect(readStoredMarShiftTimelineShiftCode(facilityA, userA)).toBeNull();
    });

    it("does not persist CUSTOM shift", () => {
      writeStoredMarShiftTimelineShiftCode(facilityA, userA, "CUSTOM");
      expect(readStoredMarShiftTimelineShiftCode(facilityA, userA)).toBeNull();
    });

    it("FacilityMarShiftTimeline wires persistence helpers", () => {
      const timeline = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
      expect(timeline).toContain("readStoredMarShiftTimelineShiftCode");
      expect(timeline).toContain("writeStoredMarShiftTimelineShiftCode");
      expect(timeline).toContain("viewerUserId");
    });
  });
});
