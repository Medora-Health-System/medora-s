import { describe, expect, it } from "vitest";
import {
  MAR_STANDARD_ADMINISTRATION_WINDOW_MINUTES,
  resolveMarAdministrationWindowStatus,
} from "./marMedicationAdministrationWindow";

describe("marMedicationAdministrationWindow (MEDUI.ED.MAR.HOTFIX.TIME.1)", () => {
  const scheduled = new Date("2026-06-03T18:00:00.000Z");

  it("scheduled 2 PM, administer 1 PM = ON_TIME", () => {
    const administered = new Date(scheduled.getTime() - 60 * 60_000);
    expect(resolveMarAdministrationWindowStatus({ scheduledAt: scheduled, administeredAt: administered }).status).toBe(
      "ON_TIME"
    );
  });

  it("scheduled 2 PM, administer 3 PM = ON_TIME", () => {
    const administered = new Date(scheduled.getTime() + 60 * 60_000);
    expect(resolveMarAdministrationWindowStatus({ scheduledAt: scheduled, administeredAt: administered }).status).toBe(
      "ON_TIME"
    );
  });

  it("scheduled 2 PM, administer 12:59 PM = EARLY advisory only", () => {
    const administered = new Date(scheduled.getTime() - 61 * 60_000);
    expect(resolveMarAdministrationWindowStatus({ scheduledAt: scheduled, administeredAt: administered }).status).toBe(
      "EARLY"
    );
  });

  it("scheduled 2 PM, administer 3:01 PM = LATE advisory only", () => {
    const administered = new Date(scheduled.getTime() + 61 * 60_000);
    expect(resolveMarAdministrationWindowStatus({ scheduledAt: scheduled, administeredAt: administered }).status).toBe(
      "LATE"
    );
  });

  it("PRN meds are never late", () => {
    const administered = new Date(scheduled.getTime() + 5 * 60 * 60_000);
    expect(
      resolveMarAdministrationWindowStatus({
        scheduledAt: scheduled,
        administeredAt: administered,
        isPrn: true,
      }).status
    ).toBe("ON_TIME");
  });

  it("uses 60 minute standard window", () => {
    expect(MAR_STANDARD_ADMINISTRATION_WINDOW_MINUTES).toBe(60);
  });
});
