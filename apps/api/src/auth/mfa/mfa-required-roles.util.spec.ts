import { RoleCode } from "@prisma/client";
import { getRequiredMfaRoles, isMfaRequiredForRoles } from "./mfa-required-roles.util";

describe("mfa-required-roles.util", () => {
  /** Phase 9 patch — universal MFA: every interactive `RoleCode` requires MFA by default. */
  it("default set covers ALL human roles (Phase 9 patch — universal MFA)", () => {
    const r = getRequiredMfaRoles({} as NodeJS.ProcessEnv);
    const allRoles = Object.values(RoleCode) as RoleCode[];
    for (const code of allRoles) {
      expect(r.has(code)).toBe(true);
    }
    // The set must equal the full enum, no surprises.
    expect(r.size).toBe(allRoles.length);
  });

  it("non-privileged roles (RN, LAB, RADIOLOGY, FRONT_DESK) trigger MFA enrollment by default", () => {
    expect(
      isMfaRequiredForRoles([{ role: RoleCode.RN }], {} as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      isMfaRequiredForRoles([{ role: RoleCode.LAB }], {} as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      isMfaRequiredForRoles([{ role: RoleCode.RADIOLOGY }], {} as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      isMfaRequiredForRoles([{ role: RoleCode.FRONT_DESK }], {} as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it("privileged roles also trigger MFA (regression for Phase 9A users)", () => {
    expect(
      isMfaRequiredForRoles([{ role: RoleCode.MEDORA_SUPER_ADMIN }], {} as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      isMfaRequiredForRoles([{ role: RoleCode.ADMIN }], {} as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      isMfaRequiredForRoles([{ role: RoleCode.PROVIDER }], {} as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      isMfaRequiredForRoles([{ role: RoleCode.PHARMACY }], {} as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      isMfaRequiredForRoles([{ role: RoleCode.BILLING }], {} as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it("override is honoured and ignores unknown role codes (escape hatch retained)", () => {
    const r = getRequiredMfaRoles({
      MFA_REQUIRED_ROLES: "PROVIDER, PHARMACY, NOPE_NOT_REAL",
    } as NodeJS.ProcessEnv);
    expect(r.has(RoleCode.PROVIDER)).toBe(true);
    expect(r.has(RoleCode.PHARMACY)).toBe(true);
    expect(r.has(RoleCode.ADMIN)).toBe(false);
    expect(r.has(RoleCode.RN)).toBe(false);
    expect(r.size).toBe(2);
  });

  it("falls back to the universal default when override has no valid entries", () => {
    const r = getRequiredMfaRoles({ MFA_REQUIRED_ROLES: "NOTHING_VALID" } as NodeJS.ProcessEnv);
    const allRoles = Object.values(RoleCode) as RoleCode[];
    expect(r.size).toBe(allRoles.length);
    for (const code of allRoles) {
      expect(r.has(code)).toBe(true);
    }
  });

  it("isMfaRequiredForRoles flips on first matching role; override that excludes them returns false", () => {
    expect(
      isMfaRequiredForRoles(
        [{ role: RoleCode.RN }, { role: RoleCode.PROVIDER }],
        {} as NodeJS.ProcessEnv
      )
    ).toBe(true);
    // With a deliberate narrow override, RN-only users no longer require MFA.
    expect(
      isMfaRequiredForRoles(
        [{ role: RoleCode.RN }],
        { MFA_REQUIRED_ROLES: "ADMIN, PROVIDER" } as NodeJS.ProcessEnv
      )
    ).toBe(false);
  });
});
