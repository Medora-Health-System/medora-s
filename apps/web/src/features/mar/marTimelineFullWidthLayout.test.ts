import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addFacilityLocalDays,
  buildHistoricalMarTimeline,
  resolveFacilityLocalToday,
  shouldUseExplicitMarShiftWindow,
} from "@/lib/marHistoricalTimeline";

const webSrcRoot = join(import.meta.dirname, "../..");
const haitiTz = "America/Port-au-Prince";

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("marTimelineFullWidthLayout (MEDUI.ED.MAR.UI.CLEANUP.1)", () => {
  const tabSrc = readSrc("components/encounters/MedicationAdministrationTab.tsx");
  const navSrc = readSrc("components/mar/MarHistoricalDateNavigationBar.tsx");
  const timelineSrc = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
  const historyApiSrc = readSrc("lib/medicationAdministrationHistoryApi.ts");

  it("1 — MAR defaults to today on open", () => {
    expect(tabSrc).toContain("useState(() =>\n    resolveFacilityLocalToday(clinicalTz)");
    expect(tabSrc).not.toContain("readStoredMarHistoricalDateLocal");
  });

  it("2 — previous day changes date", () => {
    expect(navSrc).toContain("addFacilityLocalDays(selectedDateLocal, -1");
    expect(navSrc).toContain('data-testid="mar-historical-date-prev"');
  });

  it("3 — next day changes date", () => {
    expect(navSrc).toContain("addFacilityLocalDays(selectedDateLocal, 1");
    expect(navSrc).toContain('data-testid="mar-historical-date-next"');
  });

  it("4 — Today button resets date to current day", () => {
    expect(tabSrc).toContain(
      'onToday={() => handleMarSelectedDateChange(resolveFacilityLocalToday(clinicalTz))}'
    );
  });

  it("5 — Today button enabled when selected date is not today", () => {
    expect(navSrc).toContain("disabled={isToday}");
    expect(navSrc).toContain('aria-label={t("marHistorical.todayAriaLabel")}');
  });

  it("6 — timeline receives explicit window only for non-today dates", () => {
    const historical = buildHistoricalMarTimeline({
      selectedDateLocal: "2026-06-16",
      shiftCode: "7A_7P",
      facilityTimeZone: haitiTz,
      now: new Date("2026-06-17T15:00:00.000Z"),
      locale: "en",
    });
    expect(shouldUseExplicitMarShiftWindow(historical)).toBe(true);
    expect(timelineSrc).toContain("shiftStart: explicitShiftWindow?.shiftStart");
  });

  it("7 — timeline uses live current-day behavior for today", () => {
    const today = resolveFacilityLocalToday(haitiTz, new Date("2026-06-17T15:00:00.000Z"));
    const model = buildHistoricalMarTimeline({
      selectedDateLocal: today,
      shiftCode: "7A_7P",
      facilityTimeZone: haitiTz,
      now: new Date("2026-06-17T15:00:00.000Z"),
      locale: "en",
    });
    expect(model.isToday).toBe(true);
    expect(shouldUseExplicitMarShiftWindow(model)).toBe(false);
  });

  it("8 — administration history rail is not rendered in MAR workspace", () => {
    expect(tabSrc).not.toContain("<MedicationAdministrationHistoryRail");
    expect(tabSrc).not.toContain("mar-workspace-with-history");
  });

  it("9 — MAR timeline uses full-width layout", () => {
    expect(tabSrc).toContain('data-testid="mar-workspace-timeline"');
    expect(tabSrc).toContain('width: "100%"');
    expect(tabSrc).not.toContain("marAdministrationHistoryRailTimelineWidthPercent");
  });

  it("10 — history API/read model remains intact", () => {
    expect(historyApiSrc).toContain("fetchMedicationAdministrationHistory");
    expect(tabSrc).toContain("fetchMedicationAdministrationHistory");
    expect(tabSrc).toContain("loadMarHistoryForCorrections");
  });

  it("11 — no MAR action changes in layout cleanup", () => {
    expect(tabSrc).toContain("marShiftTimelineActionHandlers");
    expect(tabSrc).toContain("openModal");
  });

  it("12 — date navigation helpers unchanged", () => {
    expect(addFacilityLocalDays("2026-06-16", -1, haitiTz)).toBe("2026-06-15");
    expect(addFacilityLocalDays("2026-06-16", 1, haitiTz)).toBe("2026-06-17");
  });
});
