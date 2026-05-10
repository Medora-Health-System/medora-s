import { RoleCode } from "@prisma/client";
import { getRequiredMfaRoles, isMfaRequiredForRoles } from "./mfa-required-roles.util";

describe("mfa-required-roles.util", () => {
  it("default set covers privileged roles only (Phase 9A policy)", () => {
    const r = getRequiredMfaRoles({} as NodeJS.ProcessEnv);
    expect(r.has(RoleCode.MEDORA_SUPER_ADMIN)).toBe(true);
    expect(r.has(RoleCode.ADMIN)).toBe(true);
    expect(r.has(RoleCode.PROVIDER)).toBe(true);
    expect(r.has(RoleCode.PHARMACY)).toBe(true);
    expect(r.has(RoleCode.BILLING)).toBe(true);
    expect(r.has(RoleCode.RN)).toBe(false);
    expect(r.has(RoleCode.LAB)).toBe(false);
    expect(r.has(RoleCode.RADIOLOGY)).toBe(false);
    expect(r.has(RoleCode.FRONT_DESK)).toBe(false);
  });

  it("override is honoured and ignores unknown role codes", () => {
    const r = getRequiredMfaRoles({
      MFA_REQUIRED_ROLES: "PROVIDER, PHARMACY, NOPE_NOT_REAL",
    } as NodeJS.ProcessEnv);
    expect(r.has(RoleCode.PROVIDER)).toBe(true);
    expect(r.has(RoleCode.PHARMACY)).toBe(true);
    expect(r.has(RoleCode.ADMIN)).toBe(false);
    expect(r.size).toBe(2);
  });

  it("falls back to default when override has no valid entries", () => {
    const r = getRequiredMfaRoles({ MFA_REQUIRED_ROLES: "NOTHING_VALID" } as NodeJS.ProcessEnv);
    expect(r.has(RoleCode.ADMIN)).toBe(true);
  });

  it("isMfaRequiredForRoles flips on first matching role", () => {
    expect(
      isMfaRequiredForRoles(
        [{ role: RoleCode.RN }, { role: RoleCode.PROVIDER }],
        {} as NodeJS.ProcessEnv
      )
    ).toBe(true);
    expect(
      isMfaRequiredForRoles(
        [{ role: RoleCode.RN }, { role: RoleCode.FRONT_DESK }],
        {} as NodeJS.ProcessEnv
      )
    ).toBe(false);
  });
});
