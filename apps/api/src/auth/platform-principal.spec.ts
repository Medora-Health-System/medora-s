import { resolvePlatformAuthority, resolvePlatformAuthorityState } from "./platform-principal";

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
});
