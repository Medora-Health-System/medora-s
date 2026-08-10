import { PlatformStaffService } from "./platform-staff.service";
const actorId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const principal = { id: actorId, isActive: true, canCreateFacilities: true, userRoles: [{ id: "assignment" }] };
const target = { isActive: true, medoraStaffProfile: { isActive: true } };

function harness(create: jest.Mock = jest.fn().mockResolvedValue({ id: "grant-id", userId: targetId, capabilityId: "cap-id" })) {
  const tx = { platformCapabilityGrant: { create, update: jest.fn() }, auditLog: { create: jest.fn().mockResolvedValue({}) } };
  const prisma: any = {
    user: { findUnique: jest.fn().mockImplementation((args: any) => Promise.resolve(args.select?.canCreateFacilities ? principal : target)) },
    platformCapability: { findUnique: jest.fn().mockResolvedValue({ id: "cap-id", isActive: true }) },
    platformCapabilityGrant: { findFirst: jest.fn().mockResolvedValueOnce(null) },
    $transaction: jest.fn().mockImplementation(async (callback: any) => callback(tx)),
  };
  const audit: any = { log: jest.fn().mockImplementation(async (_a: any, _e: any, input: any) => input.tx.auditLog.create({ data: {} })) };
  return { service: new PlatformStaffService(prisma, audit), prisma, audit, tx };
}

describe("D4SEC.1C.3 grant mutation determinism", () => {
  it("successful authorized grant emits exactly one SUCCESS audit and one mutation", async () => {
    const { service, audit, tx } = harness();
    await expect(service.grant(actorId, targetId, "STAFF_VIEW", "approved ticket")).resolves.toEqual(expect.objectContaining({ idempotent: false }));
    expect(tx.platformCapabilityGrant.create).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log.mock.calls[0][2].metadata).toEqual(expect.objectContaining({ event: "PLATFORM_CAPABILITY_GRANTED", outcome: "SUCCESS" }));
  });

  it("turns a concurrent partial-unique P2002 race into deterministic idempotent success", async () => {
    const collision = Object.assign(new Error("unique"), { code: "P2002" });
    const { service, prisma, audit } = harness(jest.fn().mockRejectedValue(collision));
    prisma.platformCapabilityGrant.findFirst.mockReset().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "winning-grant", userId: targetId, capabilityId: "cap-id", isActive: true });
    await expect(service.grant(actorId, targetId, "STAFF_VIEW", "approved ticket")).resolves.toEqual(expect.objectContaining({ id: "winning-grant", idempotent: true }));
    expect(audit.log).not.toHaveBeenCalled();
  });
});
