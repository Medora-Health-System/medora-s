import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarTimeConsistencySnapshot,
  certifyMarTimeConsistency,
  resolveMedicationClinicalDisplayTime,
  wallClockToUtc,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");
const haiti = "America/Port-au-Prince";

describe("marMedicationOrderMarTimeConsistency (MEDUI.ED.MAR.TIME.CERTIFICATION.1)", () => {
  it("order draft and MAR tab both use facility timezone helpers", () => {
    const orderDraft = readFileSync(
      join(webRoot, "components/orders/createOrderModal/createOrderMedicationDraft.ts"),
      "utf8"
    );
    const marTab = readFileSync(
      join(webRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(orderDraft).toContain("facilityTimeZone");
    expect(marTab).toContain("marClinicalDateTimeLocalToUtcIso");
    expect(marTab).toContain("resolveClinicalTimeZone");
  });

  it("same instant renders identically across order and MAR paths", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const iso = instant.toISOString();
    const orderDisplay = resolveMedicationClinicalDisplayTime({
      iso,
      facilityTimezone: haiti,
    });
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: iso,
      facilityTimezone: haiti,
    });
    expect(certifyMarTimeConsistency(snapshot).ok).toBe(true);
    expect(snapshot.orderDisplayTime).toBe(orderDisplay);
  });
});

describe("marAdministrationModalTimeConsistency (MEDUI.ED.MAR.TIME.CERTIFICATION.1)", () => {
  it("modal uses facility TZ conversion not browser datetimeLocalValueToUtcIso", () => {
    const marTab = readFileSync(
      join(webRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(marTab).toContain("facilityTzToUtcIso");
    expect(marTab).toContain("resolveMarMedicationTimingAdvisory");
    expect(marTab).not.toContain('t("marScheduleTiming.reasonRequired")');
  });

  it("modal default clinical time matches certified display", () => {
    const instant = wallClockToUtc(2026, 6, 12, 9, 30, haiti);
    const display = resolveMedicationClinicalDisplayTime({
      iso: instant,
      facilityTimezone: haiti,
    });
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: instant.toISOString(),
      facilityTimezone: haiti,
    });
    expect(snapshot.administrationModalDisplayTime).toBe(display);
  });
});

describe("marHistoryRailTimeConsistency (MEDUI.ED.MAR.TIME.CERTIFICATION.1)", () => {
  it("history rail uses facility clinical display patterns", () => {
    const historyRail = readFileSync(
      join(webRoot, "components/mar/MedicationAdministrationHistoryRail.tsx"),
      "utf8"
    );
    const historyNorm = readFileSync(
      join(webRoot, "../../../packages/shared/src/mar/medicationAdministrationHistoryNormalization.ts"),
      "utf8"
    );
    expect(historyRail).toContain("formatClinicalInstantForFacility");
    expect(historyNorm).toContain("effectiveAdministeredAt");
    expect(historyNorm).toContain("administeredAt");
  });

  it("history rail clinical time matches certified snapshot", () => {
    const instant = wallClockToUtc(2026, 6, 12, 16, 45, haiti);
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: instant.toISOString(),
      facilityTimezone: haiti,
    });
    expect(snapshot.historyRailDisplayTime).toBe(snapshot.administrationModalDisplayTime);
  });
});

describe("marTimingAdvisoryUi (MEDUI.ED.MAR.TIME.CERTIFICATION.1)", () => {
  it("shows standard window advisory test id", () => {
    const marTab = readFileSync(
      join(webRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(marTab).toContain("mar-outside-window-advisory");
    expect(marTab).toContain("mar-significant-difference-advisory");
  });

  it("does not render timing reason dropdown in modal", () => {
    const marTab = readFileSync(
      join(webRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(marTab).not.toContain("marTimingOverride.reasonPlaceholder");
    expect(marTab).not.toContain('data-testid="mar-infusion-timing-override-fields"');
  });

  it("i18n has both advisory message keys", () => {
    const en = readFileSync(join(webRoot, "i18n/messages/en.ts"), "utf8");
    const fr = readFileSync(join(webRoot, "i18n/messages/fr.ts"), "utf8");
    expect(en).toContain("significantDifferenceAdvisory");
    expect(fr).toContain("significantDifferenceAdvisory");
    expect(en).toContain("outsideWindowAdvisory");
  });
});
