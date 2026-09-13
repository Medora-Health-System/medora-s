import { ConflictException, NotFoundException } from "@nestjs/common";
import { PatientSessionSecurityService } from "./patient-session-security.service";

describe("PatientSessionSecurityService", () => {
  const principal = {
    portalAccountId: "portal-a",
    sessionId: "session-current",
  };

  function build() {
    const tx = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    } as any;
    const prisma = {
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    return { tx, prisma, service: new PatientSessionSecurityService(prisma) };
  }

  it("lists only sessions scoped to the authenticated portal account and does not expose IP or user-agent", async () => {
    const { prisma, service } = build();
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: "session-current",
        deviceName: "iPhone",
        createdAt: new Date("2026-09-12T12:00:00Z"),
        lastSeenAt: new Date("2026-09-12T13:00:00Z"),
        expiresAt: new Date("2026-10-12T12:00:00Z"),
        revokedAt: null,
      },
    ]);

    const result = await service.listActiveSessions(principal);

    const sql = prisma.$queryRaw.mock.calls[0][0];
    expect(sql.strings.join(" ")).toContain('"portalAccountId" =');
    expect(sql.values).toContain("portal-a");
    expect(result.sessions[0]).toEqual(
      expect.objectContaining({ id: "session-current", current: true, deviceName: "iPhone" }),
    );
    expect(result.sessions[0]).not.toHaveProperty("ipCreated");
    expect(result.sessions[0]).not.toHaveProperty("userAgent");
    expect(result.sessions[0]).not.toHaveProperty("refreshTokenHash");
  });

  it("refuses to revoke the current session through the remote-session endpoint", async () => {
    const { prisma, service } = build();

    await expect(
      service.revokeSession(principal, "session-current", {}),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 for a session that is not owned by the authenticated portal account", async () => {
    const { tx, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([]);

    await expect(
      service.revokeSession(principal, "session-foreign", {}),
    ).rejects.toBeInstanceOf(NotFoundException);

    const sql = tx.$queryRaw.mock.calls[0][0];
    expect(sql.values).toEqual(expect.arrayContaining(["session-foreign", "portal-a"]));
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it("revokes an owned session and writes the audit event in the same transaction", async () => {
    const { tx, prisma, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([
      {
        id: "session-other",
        deviceName: "Browser",
        createdAt: new Date(),
        lastSeenAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      },
    ]);
    tx.$executeRaw.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const result = await service.revokeSession(
      principal,
      "session-other",
      { ip: "127.0.0.1", userAgent: "jest" },
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ revoked: true, sessionId: "session-other" });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);

    const revokeSql = tx.$executeRaw.mock.calls[0][0];
    expect(revokeSql.strings.join(" ")).toContain('UPDATE "PatientPortalSession"');
    expect(revokeSql.values).toEqual(expect.arrayContaining(["session-other", "portal-a"]));

    const auditSql = tx.$executeRaw.mock.calls[1][0];
    expect(auditSql.strings.join(" ")).toContain('INSERT INTO "PatientPortalAuditLog"');
    expect(auditSql.values).toEqual(
      expect.arrayContaining([
        "portal-a",
        "session-current",
        "PATIENT_PORTAL_SESSION_REVOKE",
        "session-other",
      ]),
    );
  });

  it("revokes other active sessions while preserving the authenticated current session", async () => {
    const { tx, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([{ id: "session-a" }, { id: "session-b" }]);
    tx.$executeRaw.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const result = await service.revokeOtherSessions(principal, {});

    expect(result).toEqual({ revokedCount: 2 });
    const updateSql = tx.$executeRaw.mock.calls[0][0];
    const text = updateSql.strings.join(" ");
    expect(text).toContain('"portalAccountId" =');
    expect(text).toContain('"id" <>');
    expect(updateSql.values).toEqual(expect.arrayContaining(["portal-a", "session-current"]));

    const auditSql = tx.$executeRaw.mock.calls[1][0];
    expect(auditSql.values).toEqual(
      expect.arrayContaining([
        "portal-a",
        "session-current",
        "PATIENT_PORTAL_SESSION_REVOKE_OTHERS",
      ]),
    );
  });
});
