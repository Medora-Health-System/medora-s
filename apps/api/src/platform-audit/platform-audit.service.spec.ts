import { AuditAction } from "@prisma/client";
import { PlatformAuditService } from "./platform-audit.service";

const principal = { id: "principal", isActive: true, canCreateFacilities: true, userRoles: [{ id: "role" }] };

function harness(options: { principalState?: any; rows?: any[]; auditRejects?: boolean } = {}) {
  const rows = options.rows ?? [];
  const tx = { auditLog: { findMany: jest.fn().mockResolvedValue(rows) } };
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(options.principalState === undefined ? principal : options.principalState) },
    $transaction: jest.fn(async (callback: any) => callback(tx)),
  };
  const audit = { log: options.auditRejects ? jest.fn().mockRejectedValue(new Error("write failed")) : jest.fn().mockResolvedValue(undefined) };
  return { service: new PlatformAuditService(prisma, audit as any), prisma, tx, audit };
}

const baseQuery: any = { limit: 50 };
const event = (overrides: any = {}) => ({
  id: "event-1", createdAt: new Date("2026-08-01T00:00:00Z"), action: AuditAction.VIEW,
  entityType: "User", entityId: "entity", userId: "actor", facilityId: "facility",
  metadata: { event: "SAFE_EVENT", outcome: "SUCCESS", passwordHash: "never" },
  user: { firstName: "Active", lastName: "Actor", isActive: true },
  facility: { name: "Active Facility", isActive: true }, ...overrides,
});

describe("PlatformAuditService D4SEC.1C.2C.2", () => {
  it("allows the authoritative database-backed principal and writes exactly one payload-free access event", async () => {
    const h = harness({ rows: [event()] });
    const result = await h.service.listEvents("principal", baseQuery);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].actor.userId).toBe("actor");
    expect(JSON.stringify(result)).not.toContain("never");
    expect(h.audit.log).toHaveBeenCalledTimes(1);
    expect(h.audit.log).toHaveBeenCalledWith(AuditAction.VIEW, "EnterpriseAuditReader", expect.objectContaining({
      userId: "principal", critical: true, tx: h.tx,
      metadata: expect.objectContaining({ event: "ENTERPRISE_AUDIT_ACCESSED", resultCount: 1 }),
    }));
    expect(JSON.stringify(h.audit.log.mock.calls[0])).not.toContain("event-1");
  });

  it.each([
    ["role string without capability", { ...principal, canCreateFacilities: false }],
    ["capability without complete assignment", { ...principal, userRoles: [] }],
    ["facility ADMIN or ordinary clinical user", { ...principal, canCreateFacilities: false, userRoles: [{ id: "admin-or-clinical" }] }],
    ["deactivated principal", { ...principal, isActive: false }],
  ])("denies %s and records one security-significant denial", async (_label, state) => {
    const h = harness({ principalState: state });
    await expect(h.service.listEvents("caller-id", baseQuery)).rejects.toMatchObject({ status: 403 });
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
    expect(h.audit.log).toHaveBeenCalledTimes(1);
    expect(h.audit.log).toHaveBeenCalledWith(AuditAction.VIEW, "EnterpriseAuditReader", expect.objectContaining({
      userId: "caller-id", metadata: expect.objectContaining({ event: "ENTERPRISE_AUDIT_ACCESS_DENIED", outcome: "DENIED" }),
    }));
  });

  it("ignores email and facility-header substitution because authority resolves only caller User.id", async () => {
    const h = harness({ principalState: null });
    await expect(h.service.listEvents("substituted-user-id", { ...baseQuery, facilityId: "00000000-0000-4000-8000-000000000001" })).rejects.toMatchObject({ status: 403 });
    expect(h.prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "substituted-user-id" } }));
  });

  it("retains active/inactive/system actors and active/inactive/global facilities", async () => {
    const h = harness({ rows: [
      event(),
      event({ id: "inactive", user: { firstName: "Former", lastName: "User", isActive: false }, facility: { name: "Closed", isActive: false } }),
      event({ id: "system", userId: null, user: null, facilityId: null, facility: null }),
    ] });
    const { events } = await h.service.listEvents("principal", baseQuery);
    expect(events[0].actor).toMatchObject({ userId: "actor", isActive: true });
    expect(events[1].actor).toMatchObject({ userId: "actor", isActive: false });
    expect(events[1].facility).toMatchObject({ facilityId: "facility", isActive: false });
    expect(events[2].actor).toMatchObject({ userId: null, attribution: "SYSTEM" });
    expect(events[2].facility).toMatchObject({ facilityId: null, displayName: "Global" });
  });

  it("enforces bounded range and propagates successful access-audit write failure fail closed", async () => {
    const range = harness();
    await expect(range.service.listEvents("principal", { limit: 50, from: "2020-01-01T00:00:00.000Z", to: "2022-01-01T00:00:00.000Z" })).rejects.toMatchObject({ status: 400 });
    const failedAudit = harness({ rows: [event()], auditRejects: true });
    await expect(failedAudit.service.listEvents("principal", baseQuery)).rejects.toThrow("write failed");
  });

  it("uses deterministic ordering and rejects a cursor replayed with a different filter", async () => {
    const h = harness({ rows: [event(), event({ id: "event-0", createdAt: new Date("2026-07-31T00:00:00Z") })] });
    const first = await h.service.listEvents("principal", { limit: 1, action: AuditAction.VIEW });
    expect(h.tx.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2 }));
    await expect(h.service.listEvents("principal", { limit: 1, action: AuditAction.UPDATE, cursor: first.nextCursor! })).rejects.toMatchObject({ status: 400 });
  });
});
