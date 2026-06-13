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

  it("matches /app/patients/<id>/profile for FRONT_DESK (prefix /app/patients/)", () => {
    expect(isAppPathAllowedForRoles("/app/patients/xyz-789/profile", ["FRONT_DESK"])).toBe(true);
  });

  it("allows freestanding ER provider registration via navigation profile (MEDUI.FSER.ROLE.1)", () => {
    expect(
      isAppPathAllowedForRoles("/app/registration", ["PROVIDER"], {
        navigationProfile: {
          roleCodes: ["PROVIDER"],
          prismaDepartmentCode: "EMERGENCY",
          facilityType: "FREESTANDING_ER",
          facilityServiceLines: null,
        },
      })
    ).toBe(true);
  });

  it("allows freestanding ER provider lab worklist via navigation profile (MEDUI.FSER.ROLE.1)", () => {
    expect(
      isAppPathAllowedForRoles("/app/lab-worklist", ["PROVIDER"], {
        navigationProfile: {
          roleCodes: ["PROVIDER"],
          prismaDepartmentCode: "EMERGENCY",
          facilityType: "FREESTANDING_ER",
          facilityServiceLines: null,
        },
      })
    ).toBe(true);
  });
});
