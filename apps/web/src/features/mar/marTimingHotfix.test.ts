import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveMarMedicationTimingAdvisory,
  resolveMedicationClinicalDisplayTime,
  validateMarUniversalClinicalTime,
  wallClockToUtc,
} from "@medora/shared";
import { marRecordModalEffectiveTimeClientError } from "./marRecordModalEffectiveTime";

const webRoot = join(import.meta.dirname, "../..");

const haitiTz = "America/Port-au-Prince";

describe("marTimingJustificationRemoval (MEDUI.ED.MAR.HOTFIX.TIME.1)", () => {
  const tab = readFileSync(
    join(webRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );
  const clinicalField = readFileSync(
    join(webRoot, "components/mar/MedicationClinicalDateTimeField.tsx"),
    "utf8"
  );

  it("override reason dropdown not rendered in MAR tab", () => {
    expect(tab).not.toContain('data-testid="mar-infusion-timing-override-fields"');
    expect(tab).not.toContain("marTimingOverride.reasonPlaceholder");
    expect(tab).toContain("mar-outside-window-advisory");
  });

  it("timing detail textbox not rendered by default in clinical datetime field", () => {
    expect(clinicalField).toContain("showReasonWhenRequired = false");
    expect(clinicalField).toContain("${testId}-timing-reason");
  });

  it("clinical time differs from save time does not require reason", () => {
    const validation = validateMarUniversalClinicalTime({
      actionType: "ADMINISTER",
      clinicalTime: "2026-06-03T14:15:00.000Z",
      documentedAt: "2026-06-03T14:20:00.000Z",
    });
    expect(validation.ok).toBe(true);
  });

  it("marRecordModalEffectiveTimeClientError does not require timing reason for normal delta", () => {
    const documentedAt = new Date("2026-06-03T14:20:00.000Z");
    const err = marRecordModalEffectiveTimeClientError({
      effectiveTimeLocal: "2026-06-03T10:15",
      effectiveTimeReason: "",
      documentedAt,
      orderCreatedAt: documentedAt,
      orderItemCreatedAt: documentedAt,
      orderCancelledAt: null,
      controlledMedication: false,
      toUtcIso: (local) => (local ? `${local}:00.000Z` : null),
      t: (k) => k,
    });
    expect(err).toBeNull();
  });
});

describe("marMedicationOrderTimeZoneAlignment (MEDUI.ED.MAR.HOTFIX.TIME.1)", () => {
  it("order planned time equals MAR scheduled time in facility timezone", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haitiTz);
    const display = resolveMedicationClinicalDisplayTime({
      iso: instant,
      facilityTimezone: haitiTz,
      locale: "en-US",
    });
    expect(display).toMatch(/6\/12\/26/);
    expect(display).toMatch(/2:00/);
  });

  it("no 1-hour offset between same instant in facility display", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haitiTz);
    const a = resolveMedicationClinicalDisplayTime({ iso: instant, facilityTimezone: haitiTz });
    const b = resolveMedicationClinicalDisplayTime({ iso: instant, facilityTimezone: haitiTz });
    expect(a).toBe(b);
  });

  it("MAR tab uses facility timezone for clinical datetime conversion", () => {
    const tab = readFileSync(
      join(webRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(tab).toContain("marClinicalDateTimeLocalToUtcIso");
    expect(tab).toContain("facilityTzToUtcIso");
  });
});

describe("marAdministrationNoOverrideReason (MEDUI.ED.MAR.HOTFIX.TIME.1)", () => {
  it("early advisory does not block save at governance layer", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: new Date("2026-06-03T18:00:00.000Z"),
        clinicalEventAt: new Date("2026-06-03T16:00:00.000Z"),
      }).severity
    ).toBe("STANDARD_WINDOW");
  });

  it("late advisory does not block save at governance layer", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: new Date("2026-06-03T18:00:00.000Z"),
        clinicalEventAt: new Date("2026-06-03T20:05:00.000Z"),
      }).severity
    ).toBe("STANDARD_WINDOW");
  });
});

describe("marOneHourRule (MEDUI.ED.MAR.HOTFIX.TIME.1)", () => {
  const scheduled = new Date("2026-06-03T18:00:00.000Z");

  it("1 hour before scheduled is NONE (within window)", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: new Date(scheduled.getTime() - 60 * 60_000),
      }).severity
    ).toBe("NONE");
  });

  it("1 hour after scheduled is NONE (within window)", () => {
    expect(
      resolveMarMedicationTimingAdvisory({
        scheduledAt: scheduled,
        clinicalEventAt: new Date(scheduled.getTime() + 60 * 60_000),
      }).severity
    ).toBe("NONE");
  });
});

describe("marAdministrationWindow API regression markers", () => {
  it("controller/service does not require timing reason codes on create", () => {
    const util = readFileSync(
      join(webRoot, "../../api/src/medication-administration/mar-administration-safety-governance.util.ts"),
      "utf8"
    );
    expect(util).toContain("Advisory only — never blocks save");
  });
});
