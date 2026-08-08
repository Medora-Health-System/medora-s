import { resolvePlatformAuthority, resolvePlatformAuthorityState } from "./platform-principal";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("D4SEC.1A platform authority", () => {
  it("survives an email change because email is not authority input", () => {
    const state = {
      userId: "immutable-user-id",
      isActive: true,
      canCreateFacilities: true,
      hasActiveSuperAdminAssignment: true,
    };
    expect(resolvePlatformAuthorityState(state)).toEqual({ granted: true, reason: "GRANTED" });
    expect(Object.keys(state)).not.toContain("email");
  });

  it("denies inactive, missing-capability, and missing-assignment states", () => {
    const base = {
      userId: "user-id",
      isActive: true,
      canCreateFacilities: true,
      hasActiveSuperAdminAssignment: true,
    };
    expect(resolvePlatformAuthorityState({ ...base, isActive: false }).granted).toBe(false);
    expect(resolvePlatformAuthorityState({ ...base, canCreateFacilities: false }).granted).toBe(false);
    expect(
      resolvePlatformAuthorityState({ ...base, hasActiveSuperAdminAssignment: false }).granted
    ).toBe(false);
  });

  it("does not query or interpret the historical email", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: "historical-email-user",
      isActive: true,
      canCreateFacilities: false,
      userRoles: [],
      email: "atranchant@medora.local",
    });
    await expect(resolvePlatformAuthority({ user: { findUnique } }, "historical-email-user"))
      .resolves.toEqual({ granted: false, reason: "CAPABILITY_NOT_GRANTED" });
    expect(findUnique.mock.calls[0][0].select).not.toHaveProperty("email");
  });

  it("retains an upgraded principal after the deterministic User.id backfill", async () => {
    const upgraded = {
      id: "preexisting-immutable-user-id",
      isActive: true,
      canCreateFacilities: true,
      userRoles: [{ id: "backfilled-super-admin-assignment" }],
    };
    await expect(
      resolvePlatformAuthority(
        { user: { findUnique: jest.fn().mockResolvedValue(upgraded) } },
        upgraded.id
      )
    ).resolves.toEqual({ granted: true, reason: "GRANTED" });
  });

  it("pins the upgrade migration to capability state and existing membership, never email", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20261030120000_d4sec_1a_platform_authority_backfill/migration.sql"
      ),
      "utf8"
    );
    expect(sql).toContain('WHERE u."canCreateFacilities" = true');
    expect(sql).toContain('ORDER BY ur."facilityId" ASC');
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("approved User.id-based data repair");
    expect(sql.toLowerCase()).not.toContain("atranchant@");
    expect(sql).not.toMatch(/WHERE[^;]*email/is);
  });
});
