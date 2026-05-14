import { RoleCode } from "@prisma/client";
import { getRequiredMfaRoles, isMfaRequiredForRoles } from "./mfa-required-roles.util";

describe("mfa-required-roles.util", () => {
  it("default set is empty when MFA_REQUIRED_ROLES is unset", () => {
    const r = getRequiredMfaRoles({} as NodeJS.ProcessEnv);
    expect(r.size).toBe(0);
  });

  it("non-privileged roles do not trigger MFA enrollment without explicit env", () => {
    expect(isMfaRequiredForRoles([{ role: RoleCode.RN }], {} as NodeJS.ProcessEnv)).toBe(false);
    expect(isMfaRequiredForRoles([{ role: RoleCode.LAB }], {} as NodeJS.ProcessEnv)).toBe(false);
    expect(isMfaRequiredForRoles([{ role: RoleCode.RADIOLOGY }], {} as NodeJS.ProcessEnv)).toBe(
      false
    );
    expect(isMfaRequiredForRoles([{ role: RoleCode.FRONT_DESK }], {} as NodeJS.ProcessEnv)).toBe(
      false
    );
  });

  it("explicit MFA_REQUIRED_ROLES lists which roles trigger enrollment", () => {
    const allCsv = (Object.values(RoleCode) as string[]).join(",");
    const env = { MFA_REQUIRED_ROLES: allCsv } as NodeJS.ProcessEnv;
    expect(isMfaRequiredForRoles([{ role: RoleCode.MEDORA_SUPER_ADMIN }], env)).toBe(true);
    expect(isMfaRequiredForRoles([{ role: RoleCode.ADMIN }], env)).toBe(true);
    expect(isMfaRequiredForRoles([{ role: RoleCode.PROVIDER }], env)).toBe(true);
    expect(isMfaRequiredForRoles([{ role: RoleCode.PHARMACY }], env)).toBe(true);
    expect(isMfaRequiredForRoles([{ role: RoleCode.BILLING }], env)).toBe(true);
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

  it("override with no valid enum entries yields an empty set (no silent universal widen)", () => {
    const r = getRequiredMfaRoles({ MFA_REQUIRED_ROLES: "NOTHING_VALID" } as NodeJS.ProcessEnv);
    expect(r.size).toBe(0);
    expect(isMfaRequiredForRoles([{ role: RoleCode.ADMIN }], { MFA_REQUIRED_ROLES: "NOTHING_VALID" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("isMfaRequiredForRoles flips on first matching role; override that excludes them returns false", () => {
    expect(
      isMfaRequiredForRoles(
        [{ role: RoleCode.RN }, { role: RoleCode.PROVIDER }],
        {} as NodeJS.ProcessEnv
      )
    ).toBe(false);
    // With a deliberate narrow override, RN-only users no longer require MFA.
    expect(
      isMfaRequiredForRoles(
        [{ role: RoleCode.RN }],
        { MFA_REQUIRED_ROLES: "ADMIN, PROVIDER" } as NodeJS.ProcessEnv
      )
    ).toBe(false);
  });
});
