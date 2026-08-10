import { ForbiddenException } from "@nestjs/common";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import type { PlatformCapabilityRequirement } from "./platform-capabilities.decorator";

const actorId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const grantPolicy: PlatformCapabilityRequirement = { codes: [], mode: "ALL", allowPlatformPrincipal: true, denialAudit: { event: "PLATFORM_CAPABILITY_GRANT_DENIED", sourceOperation: "platform.staff.capability.grant", requestedCapabilityFrom: "BODY" } };
const context = (request: any) => ({ getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => request }) }) as any;
const make = (authorityUser: any, requirement = grantPolicy) => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(requirement) } as any;
  const prisma = { user: { findUnique: jest.fn().mockResolvedValue(authorityUser) } } as any;
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
  return { guard: new PlatformCapabilitiesGuard(reflector, prisma, audit), prisma, audit };
};
const deniedRequest = (overrides: Record<string, unknown> = {}) => ({ user: { userId: actorId }, params: { id: targetId }, body: { code: "STAFF_VIEW" }, headers: {}, ...overrides });
const expectDeniedAudit = async (authorityUser: any, request = deniedRequest()) => {
  const { guard, audit } = make(authorityUser);
  await expect(guard.canActivate(context(request))).rejects.toBeInstanceOf(ForbiddenException);
  expect(audit.log).toHaveBeenCalledTimes(1);
  expect(audit.log.mock.calls[0][2]).toEqual(expect.objectContaining({ userId: actorId, entityId: targetId, metadata: expect.objectContaining({ event: "PLATFORM_CAPABILITY_GRANT_DENIED", outcome: "DENIED", targetUserId: targetId, capabilityCode: "STAFF_VIEW" }) }));
};

describe("D4SEC.1C.3 centralized mutation denial audit", () => {
  it("audits ordinary facility ADMIN grant escalation", () => expectDeniedAudit({ id: actorId, isActive: true, canCreateFacilities: false, userRoles: [] }));
  it("audits ordinary Medora staff without bootstrap authority", () => expectDeniedAudit({ id: actorId, isActive: true, canCreateFacilities: false, userRoles: [] }));
  it("audits clinical-user grant escalation", () => expectDeniedAudit({ id: actorId, isActive: true, canCreateFacilities: false, userRoles: [] }));
  it("audits MEDORA_SUPER_ADMIN assignment without the complete D4SEC.1A state", () => expectDeniedAudit({ id: actorId, isActive: true, canCreateFacilities: false, userRoles: [{ id: "role" }] }));
  it("audits canCreateFacilities alone", () => expectDeniedAudit({ id: actorId, isActive: true, canCreateFacilities: true, userRoles: [] }));
  it("does not let email, facility headers, or facility roles substitute authority", async () => expectDeniedAudit({ id: actorId, isActive: true, canCreateFacilities: false, userRoles: [] }, deniedRequest({ user: { userId: actorId, email: "support@medoras.com", facilityRoles: [{ role: "ADMIN" }] }, headers: { "x-facility-id": "forged" } })));
  it("audits unauthorized revoke with only safe route semantics", async () => {
    const requirement: PlatformCapabilityRequirement = { codes: [], mode: "ALL", allowPlatformPrincipal: true, denialAudit: { event: "PLATFORM_CAPABILITY_REVOKE_DENIED", sourceOperation: "platform.staff.capability.revoke", requestedCapabilityFrom: "ROUTE" } };
    const { guard, audit } = make({ id: actorId, isActive: true, canCreateFacilities: false, userRoles: [] }, requirement);
    await expect(guard.canActivate(context({ user: { userId: actorId }, params: { id: targetId, code: "STAFF_VIEW" }, body: { arbitrary: "never logged" } }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.log.mock.calls[0][2].metadata).toEqual(expect.objectContaining({ event: "PLATFORM_CAPABILITY_REVOKE_DENIED", capabilityCode: "STAFF_VIEW" }));
    expect(JSON.stringify(audit.log.mock.calls[0])).not.toContain("never logged");
  });
  it("audits unauthorized staff classification", async () => {
    const requirement: PlatformCapabilityRequirement = { codes: [], mode: "ALL", allowPlatformPrincipal: true, denialAudit: { event: "MEDORA_STAFF_CLASSIFICATION_DENIED", sourceOperation: "platform.staff.classify", requestedCapabilityFrom: "NONE" } };
    const { guard, audit } = make({ id: actorId, isActive: true, canCreateFacilities: false, userRoles: [] }, requirement);
    await expect(guard.canActivate(context({ user: { userId: actorId }, params: { id: targetId }, body: { reason: "untrusted" } }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.log.mock.calls[0][2].metadata).toEqual(expect.objectContaining({ event: "MEDORA_STAFF_CLASSIFICATION_DENIED", targetUserId: targetId }));
    expect(JSON.stringify(audit.log.mock.calls[0])).not.toContain("untrusted");
  });
  it("audits unauthorized staff lifecycle mutation with immutable identity and authoritative operation", async () => {
    const requirement: PlatformCapabilityRequirement = { codes: [], mode: "ALL", allowPlatformPrincipal: true, requireRecentMfa: true, denialAudit: { event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.provision", requestedCapabilityFrom: "NONE" } };
    const { guard, audit } = make({ id: actorId, isActive: true, canCreateFacilities: false, userRoles: [] }, requirement);
    await expect(guard.canActivate(context({ user: { userId: actorId, email: "ignored@example.test" }, params: { id: targetId }, body: { reason: "untrusted" } }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.log.mock.calls[0][1]).toBe("MedoraStaffProfile");
    expect(audit.log.mock.calls[0][2]).toEqual(expect.objectContaining({ userId: actorId, entityId: targetId, metadata: expect.objectContaining({ event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.provision", targetUserId: targetId }) }));
    expect(JSON.stringify(audit.log.mock.calls[0])).not.toContain("ignored@example.test");
    expect(JSON.stringify(audit.log.mock.calls[0])).not.toContain("untrusted");
  });
  it("rejects a missing authenticated identity without denial-audit noise", async () => {
    const { guard, audit, prisma } = make(null);
    await expect(guard.canActivate(context({ user: undefined, params: { id: targetId } }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.log).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it("allows the complete D4SEC.1A principal without a denial event", async () => {
    const { guard, audit } = make({ id: actorId, isActive: true, canCreateFacilities: true, userRoles: [{ id: "assignment" }] });
    await expect(guard.canActivate(context(deniedRequest()))).resolves.toBe(true);
    expect(audit.log).not.toHaveBeenCalled();
  });
});

describe("D4SEC.1C.4A session-bound MFA assurance", () => {
  const steppedPolicy: PlatformCapabilityRequirement = { ...grantPolicy, requireRecentMfa: true };
  const principal = { id: actorId, isActive: true, canCreateFacilities: true, userRoles: [{ id: "assignment" }] };

  it("allows a fresh proof on the authenticated session", async () => {
    const { guard } = make(principal, steppedPolicy);
    await expect(guard.canActivate(context(deniedRequest({
      user: { userId: actorId, sessionId: "session-a", mfaVerifiedAt: new Date() },
    })))).resolves.toBe(true);
  });

  it.each([
    ["missing session", { userId: actorId, mfaVerifiedAt: new Date() }],
    ["missing proof", { userId: actorId, sessionId: "session-a" }],
    ["stale proof", { userId: actorId, sessionId: "session-a", mfaVerifiedAt: new Date(Date.now() - 301_000) }],
  ])("denies and audits %s", async (_label, user) => {
    const { guard, audit, prisma } = make(principal, steppedPolicy);
    await expect(guard.canActivate(context(deniedRequest({ user })))).rejects.toThrow("RECENT_SESSION_MFA_REQUIRED");
    expect(audit.log.mock.calls[0][2].metadata).toEqual(expect.objectContaining({
      outcome: "DENIED", denialReason: "RECENT_SESSION_MFA_REQUIRED",
    }));
    expect(prisma.user.findUnique).toHaveBeenCalled();
  });

  it("does not let Session A assurance or client headers fabricate proof for Session B", async () => {
    const { guard, audit } = make(principal, steppedPolicy);
    await expect(guard.canActivate(context(deniedRequest({
      user: { userId: actorId, sessionId: "session-b", mfaVerifiedAt: null },
      headers: {
        "x-mfa-verified-at": new Date().toISOString(),
        "x-mfa-session-id": "session-a",
        authorization: "Bearer redacted-test-token",
      },
    })))).rejects.toThrow("RECENT_SESSION_MFA_REQUIRED");
    const auditPayload = JSON.stringify(audit.log.mock.calls);
    expect(auditPayload).not.toContain("redacted-test-token");
    expect(auditPayload).not.toContain("x-mfa-verified-at");
  });
});
