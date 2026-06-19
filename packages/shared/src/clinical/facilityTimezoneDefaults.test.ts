import { describe, expect, it } from "vitest";
import {
  MEDORA_DEFAULT_FACILITY_TIMEZONE,
  resolveFacilityTimezone,
} from "./facilityTimezoneDefaults.js";

describe("facilityTimezoneDefaults (MEDUI.ENTERPRISE.TIMEZONE.1)", () => {
  it("1 — default facility timezone is America/Chicago", () => {
    expect(MEDORA_DEFAULT_FACILITY_TIMEZONE).toBe("America/Chicago");
    expect(resolveFacilityTimezone(null)).toBe("America/Chicago");
    expect(resolveFacilityTimezone("")).toBe("America/Chicago");
  });

  it("2 — invalid timezone resolves to America/Chicago", () => {
    expect(resolveFacilityTimezone("Not/A/Timezone")).toBe("America/Chicago");
  });

  it("3 — Haiti is not production fallback", () => {
    expect(resolveFacilityTimezone(null)).not.toBe("America/Port-au-Prince");
    expect(resolveFacilityTimezone(undefined)).not.toBe("America/Port-au-Prince");
  });

  it("17 — facility timezone source preserves valid IANA value", () => {
    expect(resolveFacilityTimezone("America/Chicago")).toBe("America/Chicago");
    expect(resolveFacilityTimezone("America/Denver")).toBe("America/Denver");
  });

  it("18 — missing facility timezone uses America/Chicago", () => {
    expect(resolveFacilityTimezone()).toBe("America/Chicago");
  });
});
