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

  it("binds an omitted-date cursor to the resolved default window across wall-clock changes", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-09T12:00:00.000Z"));
    try {
      const h = harness({ rows: [event(), event({ id: "event-0", createdAt: new Date("2026-07-31T00:00:00Z") })] });
      const first = await h.service.listEvents("principal", { limit: 1 });
      const payload = JSON.parse(Buffer.from(first.nextCursor!, "base64url").toString("utf8"));
      expect(payload[2]).toMatchObject({
        from: "2026-08-02T12:00:00.000Z",
        to: "2026-08-09T12:00:00.000Z",
        limit: 1,
      });

      jest.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
      await h.service.listEvents("principal", { limit: 1, cursor: first.nextCursor! });
      const secondWhere = h.tx.auditLog.findMany.mock.calls[1][0].where;
      expect(secondWhere.createdAt).toEqual({
        gte: new Date("2026-08-02T12:00:00.000Z"),
        lte: new Date("2026-08-09T12:00:00.000Z"),
      });
      expect(h.audit.log).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps explicit from/to pagination on its exact effective scope", async () => {
    const h = harness({ rows: [event(), event({ id: "event-0" })] });
    const query = { limit: 1, from: "2026-07-01T00:00:00.000Z", to: "2026-08-01T00:00:00.000Z" };
    const first = await h.service.listEvents("principal", query);
    await expect(h.service.listEvents("principal", { ...query, cursor: first.nextCursor! })).resolves.toBeDefined();
  });

  it.each([
    ["facilityId", { facilityId: "00000000-0000-4000-8000-000000000001" }],
    ["actorUserId", { actorUserId: "00000000-0000-4000-8000-000000000002" }],
    ["action", { action: AuditAction.UPDATE }],
    ["entityType", { entityType: "Encounter" }],
    ["entityId", { entityId: "different-entity" }],
    ["outcome", { outcome: "DENIED" }],
    ["severity", { severity: "CRITICAL" }],
    ["limit", { limit: 2 }],
  ])("rejects a cursor when %s changes", async (_field, change) => {
    const h = harness({ rows: [event(), event({ id: "event-0" })] });
    const first = await h.service.listEvents("principal", { limit: 1 });
    await expect(h.service.listEvents("principal", { limit: 1, cursor: first.nextCursor!, ...change } as any))
      .rejects.toMatchObject({ status: 400 });
  });

  it("uses deterministic ordering and rejects malformed cursors", async () => {
    const h = harness({ rows: [event(), event({ id: "event-0", createdAt: new Date("2026-07-31T00:00:00Z") })] });
    await h.service.listEvents("principal", { limit: 1, action: AuditAction.VIEW });
    expect(h.tx.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2 }));
    await expect(h.service.listEvents("principal", { limit: 1, cursor: "not-a-valid-cursor" })).rejects.toMatchObject({ status: 400 });
  });

  it("never treats cursor possession as authority", async () => {
    const authorized = harness({ rows: [event(), event({ id: "event-0" })] });
    const first = await authorized.service.listEvents("principal", { limit: 1 });
    const denied = harness({ principalState: null });
    await expect(denied.service.listEvents("not-authorized", { limit: 1, cursor: first.nextCursor! }))
      .rejects.toMatchObject({ status: 403 });
    expect(denied.prisma.$transaction).not.toHaveBeenCalled();
    expect(denied.audit.log).toHaveBeenCalledTimes(1);
  });
});
