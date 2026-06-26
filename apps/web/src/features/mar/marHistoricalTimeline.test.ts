import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { MedicationAdministrationHistoryEntry } from "@medora/shared";
import {
  addFacilityLocalDays,
  buildHistoricalMarTimeline,
  filterMedicationAdministrationHistoryByInstantWindow,
  resolveFacilityLocalDayBounds,
  resolveFacilityLocalToday,
  shouldUseExplicitMarShiftWindow,
} from "@/lib/marHistoricalTimeline";

const webSrcRoot = join(import.meta.dirname, "../..");
const haitiTz = "America/Port-au-Prince";

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function sampleHistoryEntry(
  overrides: Partial<MedicationAdministrationHistoryEntry>
): MedicationAdministrationHistoryEntry {
  return {
    id: "h1",
    source: "MAR",
    encounterId: "e1",
    orderItemId: "oi1",
    medicationLabel: "Acetaminophen",
    doseDisplay: "650 mg",
    route: "PO",
    eventType: "ADMINISTERED",
    eventAt: "2026-06-16T13:14:00.000Z",
    documentedAt: null,
    performedByDisplay: "Jane Smith",
    performedByRole: "RN",
    reasonCode: null,
    reasonDetail: null,
    isPrn: false,
    prnIndication: null,
    infusionPhase: null,
    medicationDoseInstanceId: "d1",
    readOnly: true,
    ...overrides,
  };
}

describe("marHistoricalTimeline (MEDUI.ED.MAR.H3)", () => {
  const tabSrc = readSrc("components/encounters/MedicationAdministrationTab.tsx");
  const timelineSrc = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
  const railSrc = readSrc("components/mar/MedicationAdministrationHistoryRail.tsx");
  const navSrc = readSrc("components/mar/MarHistoricalDateNavigationBar.tsx");

  it("1 — today default", () => {
    const now = new Date("2026-06-17T15:00:00.000Z");
    const today = resolveFacilityLocalToday(haitiTz, now);
    const model = buildHistoricalMarTimeline({
      selectedDateLocal: today,
      shiftCode: "7A_7P",
      facilityTimeZone: haitiTz,
      now,
      locale: "en",
    });
    expect(model.isToday).toBe(true);
    expect(tabSrc).toContain("resolveFacilityLocalToday(clinicalTz)");
    expect(tabSrc).not.toContain("readStoredMarHistoricalDateLocal");
  });

  it("2 — previous day navigation", () => {
    const selected = "2026-06-16";
    const prev = addFacilityLocalDays(selected, -1, haitiTz);
    expect(prev).toBe("2026-06-15");
    expect(navSrc).toContain('data-testid="mar-historical-date-prev"');
  });

  it("3 — next day navigation", () => {
    const selected = "2026-06-16";
    const next = addFacilityLocalDays(selected, 1, haitiTz);
    expect(next).toBe("2026-06-17");
    expect(navSrc).toContain('data-testid="mar-historical-date-next"');
  });

  it("4 — date picker contract", () => {
    expect(navSrc).toContain('data-testid="mar-historical-date-picker"');
    expect(navSrc).toContain('type="date"');
  });

  it("5 — facility timezone window", () => {
    const bounds = resolveFacilityLocalDayBounds("2026-06-16", haitiTz);
    const model = buildHistoricalMarTimeline({
      selectedDateLocal: "2026-06-16",
      shiftCode: "7A_7P",
      facilityTimeZone: haitiTz,
      locale: "en",
    });
    expect(model.facilityTimeZone).toBe(haitiTz);
    expect(bounds.startIso).toMatch(/2026-06-16/);
    expect(model.shiftTimeRangeLabel).toContain("–");
  });

  it("6 — historical administrations use explicit shift window", () => {
    const model = buildHistoricalMarTimeline({
      selectedDateLocal: "2026-06-16",
      shiftCode: "7A_7P",
      facilityTimeZone: haitiTz,
      now: new Date("2026-06-17T15:00:00.000Z"),
      locale: "en",
    });
    expect(model.isHistorical).toBe(true);
    expect(shouldUseExplicitMarShiftWindow(model)).toBe(true);
    expect(timelineSrc).toContain("shiftStart: explicitShiftWindow?.shiftStart");
  });

  it("7 — historical PRN visibility via timeline fetch", () => {
    const prnUtil = readFileSync(
      join(webSrcRoot, "../../api/src/medication-dose/mar-shift-timeline-prn.util.ts"),
      "utf8"
    );
    expect(timelineSrc).toContain("includeCompleted: true");
    expect(prnUtil).toContain("appendMarShiftTimelinePrnAvailabilityProjections");
  });

  it("8 — historical cancellation visibility", () => {
    const canceledUtil = readFileSync(
      join(webSrcRoot, "../../api/src/medication-dose/mar-shift-timeline-canceled.util.ts"),
      "utf8"
    );
    expect(canceledUtil).toContain("loadMarShiftTimelineCanceledPlacements");
  });

  it("9 — historical refusal in history rail filter", () => {
    const bounds = resolveFacilityLocalDayBounds("2026-06-16", haitiTz);
    const filtered = filterMedicationAdministrationHistoryByInstantWindow(
      [
        sampleHistoryEntry({
          eventType: "REFUSED",
          eventAt: "2026-06-16T18:00:00.000Z",
        }),
        sampleHistoryEntry({
          id: "h2",
          eventType: "REFUSED",
          eventAt: "2026-06-15T18:00:00.000Z",
        }),
      ],
      bounds
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.eventType).toBe("REFUSED");
  });

  it("10 — historical hold in history rail filter", () => {
    const bounds = resolveFacilityLocalDayBounds("2026-06-16", haitiTz);
    const filtered = filterMedicationAdministrationHistoryByInstantWindow(
      [sampleHistoryEntry({ eventType: "HELD", eventAt: "2026-06-16T20:00:00.000Z" })],
      bounds
    );
    expect(filtered[0]?.eventType).toBe("HELD");
  });

  it("11 — historical missed dose in history rail filter", () => {
    const filtered = filterMedicationAdministrationHistoryByInstantWindow(
      [sampleHistoryEntry({ eventType: "MISSED", eventAt: "2026-06-16T22:00:00.000Z" })],
      resolveFacilityLocalDayBounds("2026-06-16", haitiTz)
    );
    expect(filtered[0]?.eventType).toBe("MISSED");
  });

  it("12 — historical infusion start", () => {
    const filtered = filterMedicationAdministrationHistoryByInstantWindow(
      [sampleHistoryEntry({ eventType: "INFUSION_START", eventAt: "2026-06-16T12:00:00.000Z" })],
      resolveFacilityLocalDayBounds("2026-06-16", haitiTz)
    );
    expect(filtered[0]?.eventType).toBe("INFUSION_START");
  });

  it("13 — historical infusion stop", () => {
    const filtered = filterMedicationAdministrationHistoryByInstantWindow(
      [sampleHistoryEntry({ eventType: "INFUSION_STOP", eventAt: "2026-06-16T16:00:00.000Z" })],
      resolveFacilityLocalDayBounds("2026-06-16", haitiTz)
    );
    expect(filtered[0]?.eventType).toBe("INFUSION_STOP");
  });

  it("14 — shift boundary for 7A_7P", () => {
    const model = buildHistoricalMarTimeline({
      selectedDateLocal: "2026-06-16",
      shiftCode: "7A_7P",
      facilityTimeZone: haitiTz,
      locale: "en",
    });
    expect(model.shiftLabel).toBe("7A–7P");
    expect(Date.parse(model.shiftEnd)).toBeGreaterThan(Date.parse(model.shiftStart));
  });

  it("15 — midnight crossover for 7P_7A night shift", () => {
    const model = buildHistoricalMarTimeline({
      selectedDateLocal: "2026-06-16",
      shiftCode: "7P_7A",
      facilityTimeZone: haitiTz,
      locale: "en",
    });
    expect(model.shiftLabel).toBe("7P–7A");
    const start = Date.parse(model.shiftStart);
    const end = Date.parse(model.shiftEnd);
    expect(end - start).toBe(13 * 3_600_000);
  });

  it("16 — history read model remains available without MAR side rail", () => {
    expect(tabSrc).not.toContain("MedicationAdministrationHistoryRail");
    expect(tabSrc).toContain("fetchMedicationAdministrationHistory");
    expect(railSrc).toContain("filterMedicationAdministrationHistoryByInstantWindow");
  });

  it("17 — no timeline mutations in historical review except active infusion stop", () => {
    expect(timelineSrc).toContain("historicalReviewMode: true");
    expect(timelineSrc).not.toContain("historicalReadOnly ? null : actionHandlers");
    expect(tabSrc).toContain("historicalReadOnly={!marHistoricalTimeline.isToday}");
  });

  it("18 — no order mutations in historical navigation layer", () => {
    expect(navSrc).not.toContain("apiFetch");
    expect(readSrc("lib/marHistoricalTimeline.ts")).not.toContain("apiFetch");
  });

  it("19 — no PRN regressions (continuity tests remain separate)", () => {
    expect(timelineSrc).toContain("isPrnBand");
    expect(timelineSrc).not.toContain("shouldSkipOrderLineCompletionForMar");
  });

  it("20 — no cancellation regressions in navigation layer", () => {
    const canceledUtil = readFileSync(
      join(webSrcRoot, "../../api/src/medication-dose/mar-shift-timeline-canceled.util.ts"),
      "utf8"
    );
    expect(canceledUtil).toContain("loadMarShiftTimelineCanceledPlacements");
    expect(tabSrc).not.toContain("cancelMedicationOrder");
  });
});
