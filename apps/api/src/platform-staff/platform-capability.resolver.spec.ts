import { hasRequiredCapabilities, resolvePlatformCapabilities } from "./platform-capability.resolver";
const store = (value: any) => ({ user: { findUnique: jest.fn().mockResolvedValue(value) } });
const active = (codes: string[] = ["STAFF_VIEW"]) => ({ isActive: true, medoraStaffProfile: { isActive: true }, platformCapabilityGrants: codes.map((code) => ({ capability: { code } })) });

describe("D4SEC.1C.3 platform capability resolver", () => {
  it("allows active classified staff with an active grant", async () => expect((await resolvePlatformCapabilities(store(active()), "immutable-user-id")).capabilities.has("STAFF_VIEW")).toBe(true));
  it("denies staff without a grant", async () => expect((await resolvePlatformCapabilities(store(active([])), "u")).granted).toBe(false));
  it("denies inactive users", async () => expect((await resolvePlatformCapabilities(store({ ...active(), isActive: false }), "u")).reason).toBe("INACTIVE_USER"));
  it("denies inactive staff profiles", async () => expect((await resolvePlatformCapabilities(store({ ...active(), medoraStaffProfile: { isActive: false } }), "u")).reason).toBe("INACTIVE_STAFF"));
  it("denies users without classification", async () => expect((await resolvePlatformCapabilities(store({ ...active(), medoraStaffProfile: null }), "u")).reason).toBe("NOT_MEDORA_STAFF"));
  it("denies missing users", async () => expect((await resolvePlatformCapabilities(store(null), "u")).reason).toBe("USER_NOT_FOUND"));
  it("supports ANY and ALL without accepting missing codes", async () => { const r = await resolvePlatformCapabilities(store(active(["STAFF_VIEW", "SYSTEM_HEALTH_VIEW"])), "u"); expect(hasRequiredCapabilities(r, ["STAFF_VIEW", "AUDIT_EXPORT"], "ANY")).toBe(true); expect(hasRequiredCapabilities(r, ["STAFF_VIEW", "AUDIT_EXPORT"], "ALL")).toBe(false); });
  it.each(["email", "displayName", "facilityRoles", "role", "canCreateFacilities"])("does not query authority from %s", async (field) => { const s = store(active()); await resolvePlatformCapabilities(s, "u"); const select = s.user.findUnique.mock.calls[0][0].select; expect(select[field]).toBeUndefined(); });
  it("does not query patients, encounters, charts, notes, medication, orders, or results", async () => { const s = store(active()); await resolvePlatformCapabilities(s, "u"); const serialized = JSON.stringify(s.user.findUnique.mock.calls[0][0]); for (const forbidden of ["patient", "encounter", "chart", "note", "medication", "order", "result", "facility"]) expect(serialized.toLowerCase()).not.toContain(forbidden); });
  it("uses immutable User.id as its sole lookup key", async () => { const s = store(active()); await resolvePlatformCapabilities(s, "immutable-user-id"); expect(s.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "immutable-user-id" } })); });
  it("requires active, unrevoked grants and active definitions in its database predicate", async () => { const s = store(active()); await resolvePlatformCapabilities(s, "u"); expect(s.user.findUnique.mock.calls[0][0].select.platformCapabilityGrants.where).toEqual({ isActive: true, revokedAt: null, capability: { isActive: true } }); });
});
