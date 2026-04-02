import { describe, expect, it } from "vitest";
import { isAppPathAllowedForRoles } from "./landingRoute";

/**
 * Regression: trailing-slash prefixes (/app/encounters/, /app/patients/) must match detail routes.
 * See pathMatchesRule in landingRoute.ts.
 */
describe("isAppPathAllowedForRoles — detail paths under trailing-slash prefixes", () => {
  it("matches /app/encounters/<id> for RN (prefix /app/encounters/)", () => {
    expect(isAppPathAllowedForRoles("/app/encounters/abc-123", ["RN"])).toBe(true);
  });

  it("matches /app/patients/<id> for RN (prefix /app/patients/)", () => {
    expect(isAppPathAllowedForRoles("/app/patients/xyz-789", ["RN"])).toBe(true);
  });
});
