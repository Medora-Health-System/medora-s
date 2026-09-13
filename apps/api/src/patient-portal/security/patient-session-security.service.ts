import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import type { PatientPortalPrincipal } from "../auth/patient-portal.types";

type RequestContext = {
  ip?: string | null;
  userAgent?: string | null;
};

type SessionRow = {
  id: string;
  deviceName: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
};

type SqlClient = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;

@Injectable()
export class PatientSessionSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveSessions(principal: PatientPortalPrincipal) {
    const rows = await this.prisma.$queryRaw<SessionRow[]>(Prisma.sql`
      SELECT
        "id",
        "deviceName",
        "createdAt",
        "lastSeenAt",
        "expiresAt",
        "revokedAt"
      FROM "PatientPortalSession"
      WHERE "portalAccountId" = ${principal.portalAccountId}
        AND "revokedAt" IS NULL
        AND "expiresAt" > CURRENT_TIMESTAMP
      ORDER BY COALESCE("lastSeenAt", "createdAt") DESC, "createdAt" DESC
      LIMIT 50
    `);

    return {
      sessions: rows.map((row) => ({
        id: row.id,
        deviceName: row.deviceName,
        createdAt: row.createdAt,
        lastSeenAt: row.lastSeenAt,
        expiresAt: row.expiresAt,
        current: row.id === principal.sessionId,
      })),
    };
  }

  async revokeSession(
    principal: PatientPortalPrincipal,
    sessionId: string,
    context: RequestContext,
  ) {
    if (sessionId === principal.sessionId) {
      throw new ConflictException("Use logout to revoke the current session");
    }

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<SessionRow[]>(Prisma.sql`
        SELECT
          "id",
          "deviceName",
          "createdAt",
          "lastSeenAt",
          "expiresAt",
          "revokedAt"
        FROM "PatientPortalSession"
        WHERE "id" = ${sessionId}
          AND "portalAccountId" = ${principal.portalAccountId}
        LIMIT 1
        FOR UPDATE
      `);
      const session = rows[0];
      if (!session || session.revokedAt) {
        throw new NotFoundException("Patient portal session not found");
      }

      const updated = await tx.$executeRaw(Prisma.sql`
        UPDATE "PatientPortalSession"
        SET "revokedAt" = CURRENT_TIMESTAMP,
            "refreshTokenHash" = NULL,
            "lastSeenAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${sessionId}
          AND "portalAccountId" = ${principal.portalAccountId}
          AND "revokedAt" IS NULL
      `);
      if (updated !== 1) {
        throw new NotFoundException("Patient portal session not found");
      }

      await this.writeAudit(tx, {
        principal,
        action: "PATIENT_PORTAL_SESSION_REVOKE",
        entityId: sessionId,
        context,
        metadata: { currentSession: false },
      });

      return { revoked: true, sessionId };
    });
  }

  async revokeOtherSessions(
    principal: PatientPortalPrincipal,
    context: RequestContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "PatientPortalSession"
        WHERE "portalAccountId" = ${principal.portalAccountId}
          AND "id" <> ${principal.sessionId}
          AND "revokedAt" IS NULL
          AND "expiresAt" > CURRENT_TIMESTAMP
        FOR UPDATE
      `);
      const sessionIds = rows.map((row) => row.id);

      let revokedCount = 0;
      if (sessionIds.length > 0) {
        revokedCount = await tx.$executeRaw(Prisma.sql`
          UPDATE "PatientPortalSession"
          SET "revokedAt" = CURRENT_TIMESTAMP,
              "refreshTokenHash" = NULL,
              "lastSeenAt" = CURRENT_TIMESTAMP
          WHERE "portalAccountId" = ${principal.portalAccountId}
            AND "id" <> ${principal.sessionId}
            AND "revokedAt" IS NULL
            AND "expiresAt" > CURRENT_TIMESTAMP
        `);
      }

      await this.writeAudit(tx, {
        principal,
        action: "PATIENT_PORTAL_SESSION_REVOKE_OTHERS",
        entityId: principal.sessionId,
        context,
        metadata: { revokedCount },
      });

      return { revokedCount };
    });
  }

  private async writeAudit(
    tx: SqlClient,
    input: {
      principal: PatientPortalPrincipal;
      action: string;
      entityId: string;
      context: RequestContext;
      metadata: Prisma.InputJsonValue;
    },
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "PatientPortalAuditLog" (
        "id",
        "portalAccountId",
        "sessionId",
        "facilityId",
        "patientId",
        "action",
        "entityType",
        "entityId",
        "ip",
        "userAgent",
        "metadata",
        "createdAt"
      ) VALUES (
        ${randomUUID()},
        ${input.principal.portalAccountId},
        ${input.principal.sessionId},
        NULL,
        NULL,
        ${input.action},
        'PatientPortalSession',
        ${input.entityId},
        ${input.context.ip ?? null},
        ${input.context.userAgent ?? null},
        ${JSON.stringify(input.metadata)}::jsonb,
        CURRENT_TIMESTAMP
      )
    `);
  }
}
